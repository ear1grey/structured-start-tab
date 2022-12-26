const makeRequest = async (url, method = 'GET', body = null, headers = {}) => {
  headers = {
    ...headers,
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  response.content = await response.text();
  try {
    response.content = JSON.parse(response.content);
    response.isJSON = true;
  } catch { }

  return response;
};

export {
  makeRequest,
};
