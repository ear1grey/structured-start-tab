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

  if (response.status !== 204) {
    return await response.json();
  }
};

export {
  makeRequest,
};
