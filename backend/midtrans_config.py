import os
from dotenv import load_dotenv
import midtransclient  # type: ignore

load_dotenv()

SERVER_KEY = os.getenv("MIDTRANS_SERVER_KEY", "")
CLIENT_KEY = os.getenv("MIDTRANS_CLIENT_KEY", "")
IS_PRODUCTION = os.getenv("MIDTRANS_IS_PRODUCTION", "false").lower() in ("true", "1", "t")

if not SERVER_KEY or not CLIENT_KEY:
    print("[WARNING] MIDTRANS_SERVER_KEY atau MIDTRANS_CLIENT_KEY belum diset di file .env!")

snap = midtransclient.Snap(
    is_production=IS_PRODUCTION,
    server_key=SERVER_KEY,
    client_key=CLIENT_KEY,
)

core_api = midtransclient.CoreApi(
    is_production=IS_PRODUCTION,
    server_key=SERVER_KEY,
)