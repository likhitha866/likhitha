function handleLogin() {
  const user = document.getElementById('username').value;
  const pass = document.getElementById('password').value;

  // Hardcoded credentials for now (replace with API call later)
  const validUsers = [
    { username: 'admin', password: 'admin123', role: 'admin' },
    { username: 'officer1', password: 'police1', role: 'officer' }
  ];

  const match = validUsers.find(u => u.username === user && u.password === pass);

  if (match) {
    localStorage.setItem('crimeAppUser', JSON.stringify(match));
    window.location.href = 'index.html';
  } else {
    document.getElementById('error-msg').style.display = 'block';
  }
}