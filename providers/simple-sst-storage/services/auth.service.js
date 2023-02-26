export const validateRequest = (req) => {
  if (!req) return { valid: false, status: 400, message: 'Missing request' };

  const authValidationResult = validateAuthToken(req);
  if (!authValidationResult.valid) { return authValidationResult; }

  return { valid: true };
};


const validateAuthToken = (req) => {
  const token = req.headers.authorization;
  if (!token) return { valid: false, status: 400, message: 'Missing authorization header' };

  const allowedTokens = process.env.AUTH_TOKENS;
  if (!allowedTokens) return { valid: true };

  if (allowedTokens.includes(token)) {
    return { valid: true };
  } else {
    return { valid: false, status: 401, message: 'Unauthorized' };
  }
};
