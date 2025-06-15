from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
import subprocess

terminal_bp = Blueprint("terminal", __name__)

@terminal_bp.route("/terminal/execute", methods=["POST"])
@jwt_required()
def execute_command():
    data = request.get_json()
    command = data.get("command")

    if not command:
        return jsonify({"message": "Command not provided"}), 400

    try:
        # Execute the command and capture its output
        result = subprocess.run(command, shell=True, capture_output=True, text=True, check=True)
        return jsonify({"output": result.stdout, "error": result.stderr}), 200
    except subprocess.CalledProcessError as e:
        return jsonify({"output": e.stdout, "error": e.stderr}), 400
    except Exception as e:
        return jsonify({"message": f"An error occurred: {str(e)}"}), 500


