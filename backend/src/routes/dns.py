from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.user import User, Domain, DNSRecord, db
import subprocess
import re
import socket

dns_bp = Blueprint('dns', __name__)

def validate_domain(domain):
    """Validate domain name format"""
    pattern = r'^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$'
    return re.match(pattern, domain) is not None

def validate_ip(ip):
    """Validate IP address"""
    try:
        socket.inet_aton(ip)
        return True
    except socket.error:
        return False

@dns_bp.route('/dns/records', methods=['GET'])
@jwt_required()
def get_dns_records():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        domain_name = request.args.get('domain')
        
        if current_user.role == 'admin':
            # Admin can see all DNS records
            if domain_name:
                domain = Domain.query.filter_by(name=domain_name).first()
                if not domain:
                    return jsonify({'error': 'Domain tidak ditemukan'}), 404
                records = DNSRecord.query.filter_by(domain_id=domain.id).all()
            else:
                records = DNSRecord.query.all()
        else:
            # Regular users can only see their own DNS records
            user_domains = Domain.query.filter_by(user_id=current_user_id).all()
            domain_ids = [d.id for d in user_domains]
            
            if domain_name:
                domain = Domain.query.filter_by(name=domain_name, user_id=current_user_id).first()
                if not domain:
                    return jsonify({'error': 'Domain tidak ditemukan atau tidak memiliki akses'}), 404
                records = DNSRecord.query.filter_by(domain_id=domain.id).all()
            else:
                records = DNSRecord.query.filter(DNSRecord.domain_id.in_(domain_ids)).all()
        
        records_data = []
        for record in records:
            domain = Domain.query.get(record.domain_id)
            records_data.append({
                'id': record.id,
                'domain': domain.name if domain else 'Unknown',
                'name': record.name,
                'type': record.type,
                'value': record.value,
                'ttl': record.ttl,
                'priority': record.priority,
                'created_at': record.created_at.isoformat() if record.created_at else None
            })
        
        return jsonify({'records': records_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@dns_bp.route('/dns/records', methods=['POST'])
@jwt_required()
def create_dns_record():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        data = request.get_json()
        domain_name = data.get('domain')
        name = data.get('name', '')
        record_type = data.get('type')
        value = data.get('value')
        ttl = data.get('ttl', 3600)
        priority = data.get('priority')
        
        # Validation
        if not domain_name or not record_type or not value:
            return jsonify({'error': 'Domain, type, dan value wajib diisi'}), 400
        
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
        
        # Validate record type and value
        valid_types = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'PTR', 'SRV']
        if record_type not in valid_types:
            return jsonify({'error': f'Type record tidak valid. Gunakan: {", ".join(valid_types)}'}), 400
        
        # Type-specific validation
        if record_type == 'A' and not validate_ip(value):
            return jsonify({'error': 'Value untuk A record harus berupa IP address yang valid'}), 400
        
        if record_type == 'MX' and not priority:
            return jsonify({'error': 'Priority wajib diisi untuk MX record'}), 400
        
        # Create DNS record
        dns_record = DNSRecord(
            domain_id=domain.id,
            name=name,
            type=record_type,
            value=value,
            ttl=ttl,
            priority=priority
        )
        
        db.session.add(dns_record)
        db.session.commit()
        
        return jsonify({
            'message': 'DNS record berhasil dibuat',
            'record': {
                'id': dns_record.id,
                'domain': domain.name,
                'name': dns_record.name,
                'type': dns_record.type,
                'value': dns_record.value,
                'ttl': dns_record.ttl,
                'priority': dns_record.priority
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@dns_bp.route('/dns/records/<int:record_id>', methods=['PUT'])
@jwt_required()
def update_dns_record(record_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        dns_record = DNSRecord.query.get(record_id)
        if not dns_record:
            return jsonify({'error': 'DNS record tidak ditemukan'}), 404
        
        # Check permissions
        domain = Domain.query.get(dns_record.domain_id)
        if current_user.role != 'admin' and domain.user_id != current_user_id:
            return jsonify({'error': 'Tidak memiliki akses untuk mengubah record ini'}), 403
        
        data = request.get_json()
        
        # Update fields if provided
        if 'name' in data:
            dns_record.name = data['name']
        if 'type' in data:
            if data['type'] not in ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'PTR', 'SRV']:
                return jsonify({'error': 'Type record tidak valid'}), 400
            dns_record.type = data['type']
        if 'value' in data:
            # Validate based on type
            if dns_record.type == 'A' and not validate_ip(data['value']):
                return jsonify({'error': 'Value untuk A record harus berupa IP address yang valid'}), 400
            dns_record.value = data['value']
        if 'ttl' in data:
            dns_record.ttl = data['ttl']
        if 'priority' in data:
            dns_record.priority = data['priority']
        
        db.session.commit()
        
        return jsonify({
            'message': 'DNS record berhasil diupdate',
            'record': {
                'id': dns_record.id,
                'domain': domain.name,
                'name': dns_record.name,
                'type': dns_record.type,
                'value': dns_record.value,
                'ttl': dns_record.ttl,
                'priority': dns_record.priority
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@dns_bp.route('/dns/records/<int:record_id>', methods=['DELETE'])
@jwt_required()
def delete_dns_record(record_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        dns_record = DNSRecord.query.get(record_id)
        if not dns_record:
            return jsonify({'error': 'DNS record tidak ditemukan'}), 404
        
        # Check permissions
        domain = Domain.query.get(dns_record.domain_id)
        if current_user.role != 'admin' and domain.user_id != current_user_id:
            return jsonify({'error': 'Tidak memiliki akses untuk menghapus record ini'}), 403
        
        db.session.delete(dns_record)
        db.session.commit()
        
        return jsonify({'message': 'DNS record berhasil dihapus'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@dns_bp.route('/dns/lookup', methods=['GET'])
@jwt_required()
def dns_lookup():
    try:
        domain = request.args.get('domain')
        record_type = request.args.get('type', 'A')
        
        if not domain:
            return jsonify({'error': 'Domain wajib diisi'}), 400
        
        if not validate_domain(domain):
            return jsonify({'error': 'Format domain tidak valid'}), 400
        
        # Perform DNS lookup using nslookup
        try:
            if record_type == 'A':
                result = subprocess.run(['nslookup', '-type=A', domain], 
                                      capture_output=True, text=True, timeout=10)
            elif record_type == 'MX':
                result = subprocess.run(['nslookup', '-type=MX', domain], 
                                      capture_output=True, text=True, timeout=10)
            elif record_type == 'NS':
                result = subprocess.run(['nslookup', '-type=NS', domain], 
                                      capture_output=True, text=True, timeout=10)
            elif record_type == 'TXT':
                result = subprocess.run(['nslookup', '-type=TXT', domain], 
                                      capture_output=True, text=True, timeout=10)
            else:
                result = subprocess.run(['nslookup', domain], 
                                      capture_output=True, text=True, timeout=10)
            
            return jsonify({
                'domain': domain,
                'type': record_type,
                'output': result.stdout,
                'error': result.stderr if result.stderr else None
            }), 200
            
        except subprocess.TimeoutExpired:
            return jsonify({'error': 'DNS lookup timeout'}), 408
        except Exception as e:
            return jsonify({'error': f'DNS lookup failed: {str(e)}'}), 500
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@dns_bp.route('/dns/zones', methods=['GET'])
@jwt_required()
def get_dns_zones():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.role == 'admin':
            domains = Domain.query.all()
        else:
            domains = Domain.query.filter_by(user_id=current_user_id).all()
        
        zones = []
        for domain in domains:
            records_count = DNSRecord.query.filter_by(domain_id=domain.id).count()
            zones.append({
                'domain': domain.name,
                'records_count': records_count,
                'status': domain.status,
                'created_at': domain.created_at.isoformat() if domain.created_at else None
            })
        
        return jsonify({'zones': zones}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

