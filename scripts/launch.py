"""Serve the built web game locally and open the user's browser."""
from functools import partial
from hmac import compare_digest
from http.client import HTTPConnection
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from secrets import token_urlsafe
from threading import Thread
import sys
import webbrowser


PORT = 4188
ROOT = Path(__file__).resolve().parents[1]
STOP_TOKEN = ROOT / ".last-degree-stop-token"
STOP_PATH = "/__last_degree_stop"


class GameHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, stop_token: str, **kwargs):
        self.stop_token = stop_token.encode("ascii")
        super().__init__(*args, **kwargs)

    def do_POST(self):
        token = self.headers.get("X-Last-Degree-Stop", "").encode("latin-1")
        if self.path != STOP_PATH or not compare_digest(token, self.stop_token):
            self.send_error(404)
            return
        self.send_response(204)
        self.end_headers()
        Thread(target=self.server.shutdown, daemon=True).start()


def stop():
    try:
        token = STOP_TOKEN.read_text(encoding="ascii").strip()
    except FileNotFoundError:
        print("No game launcher to stop.")
        return
    connection = HTTPConnection("127.0.0.1", PORT, timeout=3)
    try:
        connection.request("POST", STOP_PATH, headers={"X-Last-Degree-Stop": token})
        if connection.getresponse().status != 204:
            raise SystemExit("Port 4188 did not confirm the game launcher. No process was stopped.")
    except OSError as error:
        raise SystemExit("The game launcher did not respond on port 4188.") from error
    finally:
        connection.close()
    print("Game launcher is shutting down.")


def launch():
    root = ROOT / "dist"
    if not (root / "index.html").is_file():
        raise SystemExit("Run pnpm build first.")
    token = token_urlsafe(32)
    try:
        handler = partial(GameHandler, directory=root, stop_token=token)
        server = ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    except OSError as error:
        raise SystemExit(f"Could not bind port {PORT}. Close any previous game launcher and retry.") from error
    with server:
        url = f"http://127.0.0.1:{PORT}/"
        STOP_TOKEN.write_text(token, encoding="ascii")
        print(f"The Last Degree is running at {url}. Use Stop.bat or Ctrl+C to stop.", flush=True)
        try:
            webbrowser.open(url)
            server.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            STOP_TOKEN.unlink(missing_ok=True)


if __name__ == "__main__":
    if sys.argv[1:] == ["--stop"]:
        stop()
    else:
        launch()
