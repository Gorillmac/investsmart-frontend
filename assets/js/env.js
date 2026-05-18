const isLocalInvestSmart =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

window.INVESTSMART_API_BASE = isLocalInvestSmart
  ? "../backend/api/index.php"
  : "https://chase-frying-applicant.ngrok-free.dev/investsmart/backend/api/index.php";
