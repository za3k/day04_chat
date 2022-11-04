run-debug:
	flask --debug run
run-demo:
	gunicorn3 -e SCRIPT_NAME=/hackaday/chat --bind 0.0.0.0:8003 app:app
