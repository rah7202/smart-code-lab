export function isTokenValid(token: string | null): boolean {
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));

    // check expiry
    if (!payload.exp) return false;

    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function getUserFromToken() {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload; // contains username
  } catch {
    return null;
  }
}