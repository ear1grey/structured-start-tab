const makeRequest = async (url, method = 'GET', body = null, headers = {}) => {
  headers = {
    ...headers,
    'Content-Type': 'application/json',
  };

  return (await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  })).json();
};

export {
  makeRequest,
};
