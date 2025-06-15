from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.user import User, Domain, SSLCertificate, db
import subprocess
import os
import ssl
import socket
from datetime import datetime, timedelta
import tempfile
import base64
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa

ssl_bp = Blueprint('ssl', __name__)

def validate_domain(domain):
    """Validate domain name format"""
    import re
    pattern = r'^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$'
    return re.match(pattern, domain) is not None

def check_ssl_certificate(domain, port=443):
    """Check SSL certificate for a domain"""
    try:
        context = ssl.create_default_context()
        with socket.create_connection((domain, port), timeout=10) as sock:
            with context.wrap_socket(sock, server_hostname=domain) as ssock:
                cert_der = ssock.getpeercert(True)
                cert_pem = ssl.DER_cert_to_PEM_cert(cert_der)
                cert = x509.load_pem_x509_certificate(cert_pem.encode())
                
                # Extract certificate information
                subject = cert.subject
                issuer = cert.issuer
                
                # Get common name
                common_name = None
                for attribute in subject:
                    if attribute.oid == NameOID.COMMON_NAME:
                        common_name = attribute.value
                        break
                
                # Get issuer name
                issuer_name = None
                for attribute in issuer:
                    if attribute.oid == NameOID.COMMON_NAME:
                        issuer_name = attribute.value
                        break
                
                # Get SAN (Subject Alternative Names)
                san_list = []
                try:
                    san_ext = cert.extensions.get_extension_for_oid(x509.oid.ExtensionOID.SUBJECT_ALTERNATIVE_NAME)
                    san_list = [name.value for name in san_ext.value]
                except x509.ExtensionNotFound:
                    pass
                
                return {
                    'valid': True,
                    'common_name': common_name,
                    'issuer': issuer_name,
                    'not_before': cert.not_valid_before.isoformat(),
                    'not_after': cert.not_valid_after.isoformat(),
                    'days_until_expiry': (cert.not_valid_after - datetime.now()).days,
                    'san': san_list,
                    'serial_number': str(cert.serial_number),
                    'signature_algorithm': cert.signature_algorithm_oid._name
                }
    except Exception as e:
        return {
            'valid': False,
            'error': str(e)
        }

def generate_self_signed_certificate(domain, days=365):
    """Generate a self-signed SSL certificate"""
    try:
        # Generate private key
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )
        
        # Create certificate
        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COUNTRY_NAME, "US"),
            x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "State"),
            x509.NameAttribute(NameOID.LOCALITY_NAME, "City"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Organization"),
            x509.NameAttribute(NameOID.COMMON_NAME, domain),
        ])
        
        cert = x509.CertificateBuilder().subject_name(
            subject
        ).issuer_name(
            issuer
        ).public_key(
            private_key.public_key()
        ).serial_number(
            x509.random_serial_number()
        ).not_valid_before(
            datetime.utcnow()
        ).not_valid_after(
            datetime.utcnow() + timedelta(days=days)
        ).add_extension(
            x509.SubjectAlternativeName([
                x509.DNSName(domain),
            ]),
            critical=False,
        ).sign(private_key, hashes.SHA256())
        
        # Serialize certificate and private key
        cert_pem = cert.public_bytes(serialization.Encoding.PEM)
        key_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
        
        return {
            'certificate': cert_pem.decode(),
            'private_key': key_pem.decode(),
            'success': True
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

@ssl_bp.route('/ssl/certificates', methods=['GET'])
@jwt_required()
def get_ssl_certificates():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        domain_name = request.args.get('domain')
        
        if current_user.role == 'admin':
            if domain_name:
                domain = Domain.query.filter_by(name=domain_name).first()
                if not domain:
                    return jsonify({'error': 'Domain tidak ditemukan'}), 404
                certificates = SSLCertificate.query.filter_by(domain_id=domain.id).all()
            else:
                certificates = SSLCertificate.query.all()
        else:
            user_domains = Domain.query.filter_by(user_id=current_user_id).all()
            domain_ids = [d.id for d in user_domains]
            
            if domain_name:
                domain = Domain.query.filter_by(name=domain_name, user_id=current_user_id).first()
                if not domain:
                    return jsonify({'error': 'Domain tidak ditemukan atau tidak memiliki akses'}), 404
                certificates = SSLCertificate.query.filter_by(domain_id=domain.id).all()
            else:
                certificates = SSLCertificate.query.filter(SSLCertificate.domain_id.in_(domain_ids)).all()
        
        certificates_data = []
        for cert in certificates:
            domain = Domain.query.get(cert.domain_id)
            certificates_data.append({
                'id': cert.id,
                'domain': domain.name if domain else 'Unknown',
                'type': cert.type,
                'status': cert.status,
                'issuer': cert.issuer,
                'not_before': cert.not_before.isoformat() if cert.not_before else None,
                'not_after': cert.not_after.isoformat() if cert.not_after else None,
                'days_until_expiry': (cert.not_after - datetime.now()).days if cert.not_after else None,
                'auto_renew': cert.auto_renew,
                'created_at': cert.created_at.isoformat() if cert.created_at else None
            })
        
        return jsonify({'certificates': certificates_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ssl_bp.route('/ssl/certificates', methods=['POST'])
@jwt_required()
def create_ssl_certificate():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        data = request.get_json()
        domain_name = data.get('domain')
        cert_type = data.get('type', 'self_signed')  # self_signed, uploaded, letsencrypt
        certificate_data = data.get('certificate')
        private_key_data = data.get('private_key')
        auto_renew = data.get('auto_renew', False)
        
        if not domain_name:
            return jsonify({'error': 'Domain wajib diisi'}), 400
        
        if not validate_domain(domain_name):
            return jsonify({'error': 'Format domain tidak valid'}), 400
        
        # Check if user owns the domain or is admin
        if current_user.role != 'admin':
            domain = Domain.query.filter_by(name=domain_name, user_id=current_user_id).first()
            if not domain:
                return jsonify({'error': 'Domain tidak ditemukan atau tidak memiliki akses'}), 404
        else:
            domain = Domain.query.filter_by(name=domain_name).first()
            if not domain:
                return jsonify({'error': 'Domain tidak ditemukan'}), 404
        
        # Check if certificate already exists for this domain
        existing_cert = SSLCertificate.query.filter_by(domain_id=domain.id).first()
        if existing_cert:
            return jsonify({'error': 'SSL certificate sudah ada untuk domain ini'}), 400
        
        if cert_type == 'self_signed':
            # Generate self-signed certificate
            result = generate_self_signed_certificate(domain_name)
            if not result['success']:
                return jsonify({'error': f'Gagal generate certificate: {result["error"]}'}), 500
            
            certificate_data = result['certificate']
            private_key_data = result['private_key']
            
            # Parse certificate to get details
            cert = x509.load_pem_x509_certificate(certificate_data.encode())
            issuer_name = "Self-Signed"
            not_before = cert.not_valid_before
            not_after = cert.not_valid_after
            
        elif cert_type == 'uploaded':
            if not certificate_data or not private_key_data:
                return jsonify({'error': 'Certificate dan private key wajib diisi untuk uploaded certificate'}), 400
            
            try:
                # Validate certificate
                cert = x509.load_pem_x509_certificate(certificate_data.encode())
                
                # Get issuer
                issuer_name = None
                for attribute in cert.issuer:
                    if attribute.oid == NameOID.COMMON_NAME:
                        issuer_name = attribute.value
                        break
                
                not_before = cert.not_valid_before
                not_after = cert.not_valid_after
                
            except Exception as e:
                return jsonify({'error': f'Certificate tidak valid: {str(e)}'}), 400
        
        elif cert_type == 'letsencrypt':
            # For Let's Encrypt, we would integrate with ACME client
            # For now, return not implemented
            return jsonify({'error': 'Let\'s Encrypt integration belum diimplementasikan'}), 501
        
        else:
            return jsonify({'error': 'Type certificate tidak valid'}), 400
        
        # Create SSL certificate record
        ssl_cert = SSLCertificate(
            domain_id=domain.id,
            type=cert_type,
            status='active',
            certificate=certificate_data,
            private_key=private_key_data,
            issuer=issuer_name,
            not_before=not_before,
            not_after=not_after,
            auto_renew=auto_renew
        )
        
        db.session.add(ssl_cert)
        db.session.commit()
        
        return jsonify({
            'message': 'SSL certificate berhasil dibuat',
            'certificate': {
                'id': ssl_cert.id,
                'domain': domain.name,
                'type': ssl_cert.type,
                'status': ssl_cert.status,
                'issuer': ssl_cert.issuer,
                'not_after': ssl_cert.not_after.isoformat() if ssl_cert.not_after else None,
                'auto_renew': ssl_cert.auto_renew
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@ssl_bp.route('/ssl/certificates/<int:cert_id>', methods=['PUT'])
@jwt_required()
def update_ssl_certificate(cert_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        ssl_cert = SSLCertificate.query.get(cert_id)
        if not ssl_cert:
            return jsonify({'error': 'SSL certificate tidak ditemukan'}), 404
        
        # Check permissions
        domain = Domain.query.get(ssl_cert.domain_id)
        if current_user.role != 'admin' and domain.user_id != current_user_id:
            return jsonify({'error': 'Tidak memiliki akses untuk mengubah certificate ini'}), 403
        
        data = request.get_json()
        
        # Update fields if provided
        if 'status' in data:
            valid_statuses = ['active', 'inactive', 'expired', 'revoked']
            if data['status'] not in valid_statuses:
                return jsonify({'error': f'Status tidak valid. Gunakan: {", ".join(valid_statuses)}'}), 400
            ssl_cert.status = data['status']
        
        if 'auto_renew' in data:
            ssl_cert.auto_renew = data['auto_renew']
        
        db.session.commit()
        
        return jsonify({
            'message': 'SSL certificate berhasil diupdate',
            'certificate': {
                'id': ssl_cert.id,
                'domain': domain.name,
                'status': ssl_cert.status,
                'auto_renew': ssl_cert.auto_renew
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@ssl_bp.route('/ssl/certificates/<int:cert_id>', methods=['DELETE'])
@jwt_required()
def delete_ssl_certificate(cert_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        ssl_cert = SSLCertificate.query.get(cert_id)
        if not ssl_cert:
            return jsonify({'error': 'SSL certificate tidak ditemukan'}), 404
        
        # Check permissions
        domain = Domain.query.get(ssl_cert.domain_id)
        if current_user.role != 'admin' and domain.user_id != current_user_id:
            return jsonify({'error': 'Tidak memiliki akses untuk menghapus certificate ini'}), 403
        
        db.session.delete(ssl_cert)
        db.session.commit()
        
        return jsonify({'message': 'SSL certificate berhasil dihapus'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@ssl_bp.route('/ssl/check', methods=['GET'])
@jwt_required()
def check_ssl():
    try:
        domain = request.args.get('domain')
        port = request.args.get('port', 443, type=int)
        
        if not domain:
            return jsonify({'error': 'Domain wajib diisi'}), 400
        
        if not validate_domain(domain):
            return jsonify({'error': 'Format domain tidak valid'}), 400
        
        # Check SSL certificate
        result = check_ssl_certificate(domain, port)
        
        return jsonify({
            'domain': domain,
            'port': port,
            **result
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ssl_bp.route('/ssl/certificates/<int:cert_id>/download', methods=['GET'])
@jwt_required()
def download_ssl_certificate(cert_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        ssl_cert = SSLCertificate.query.get(cert_id)
        if not ssl_cert:
            return jsonify({'error': 'SSL certificate tidak ditemukan'}), 404
        
        # Check permissions
        domain = Domain.query.get(ssl_cert.domain_id)
        if current_user.role != 'admin' and domain.user_id != current_user_id:
            return jsonify({'error': 'Tidak memiliki akses untuk download certificate ini'}), 403
        
        cert_type = request.args.get('type', 'certificate')  # certificate, private_key, both
        
        if cert_type == 'certificate':
            return jsonify({
                'certificate': ssl_cert.certificate
            }), 200
        elif cert_type == 'private_key':
            return jsonify({
                'private_key': ssl_cert.private_key
            }), 200
        elif cert_type == 'both':
            return jsonify({
                'certificate': ssl_cert.certificate,
                'private_key': ssl_cert.private_key
            }), 200
        else:
            return jsonify({'error': 'Type tidak valid. Gunakan: certificate, private_key, both'}), 400
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ssl_bp.route('/ssl/certificates/expiring', methods=['GET'])
@jwt_required()
def get_expiring_certificates():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        days = request.args.get('days', 30, type=int)  # Default 30 days
        expiry_date = datetime.now() + timedelta(days=days)
        
        if current_user.role == 'admin':
            certificates = SSLCertificate.query.filter(
                SSLCertificate.not_after <= expiry_date,
                SSLCertificate.status == 'active'
            ).all()
        else:
            user_domains = Domain.query.filter_by(user_id=current_user_id).all()
            domain_ids = [d.id for d in user_domains]
            certificates = SSLCertificate.query.filter(
                SSLCertificate.domain_id.in_(domain_ids),
                SSLCertificate.not_after <= expiry_date,
                SSLCertificate.status == 'active'
            ).all()
        
        certificates_data = []
        for cert in certificates:
            domain = Domain.query.get(cert.domain_id)
            days_until_expiry = (cert.not_after - datetime.now()).days if cert.not_after else None
            certificates_data.append({
                'id': cert.id,
                'domain': domain.name if domain else 'Unknown',
                'type': cert.type,
                'issuer': cert.issuer,
                'not_after': cert.not_after.isoformat() if cert.not_after else None,
                'days_until_expiry': days_until_expiry,
                'auto_renew': cert.auto_renew
            })
        
        return jsonify({
            'certificates': certificates_data,
            'count': len(certificates_data)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ssl_bp.route('/ssl/stats', methods=['GET'])
@jwt_required()
def get_ssl_stats():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.role == 'admin':
            total_certs = SSLCertificate.query.count()
            active_certs = SSLCertificate.query.filter_by(status='active').count()
            expired_certs = SSLCertificate.query.filter_by(status='expired').count()
            expiring_soon = SSLCertificate.query.filter(
                SSLCertificate.not_after <= datetime.now() + timedelta(days=30),
                SSLCertificate.status == 'active'
            ).count()
        else:
            user_domains = Domain.query.filter_by(user_id=current_user_id).all()
            domain_ids = [d.id for d in user_domains]
            
            total_certs = SSLCertificate.query.filter(SSLCertificate.domain_id.in_(domain_ids)).count()
            active_certs = SSLCertificate.query.filter(
                SSLCertificate.domain_id.in_(domain_ids),
                SSLCertificate.status == 'active'
            ).count()
            expired_certs = SSLCertificate.query.filter(
                SSLCertificate.domain_id.in_(domain_ids),
                SSLCertificate.status == 'expired'
            ).count()
            expiring_soon = SSLCertificate.query.filter(
                SSLCertificate.domain_id.in_(domain_ids),
                SSLCertificate.not_after <= datetime.now() + timedelta(days=30),
                SSLCertificate.status == 'active'
            ).count()
        
        return jsonify({
            'total': total_certs,
            'active': active_certs,
            'expired': expired_certs,
            'expiring_soon': expiring_soon
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

