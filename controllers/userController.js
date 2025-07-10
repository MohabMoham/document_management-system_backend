const {
  registerUserService,
  loginUserService,
} = require('../services/auth.service');

// Egyptian National ID Validator
function isValidEgyptianNationalId(nationalId) {
  const regex = /^(2|3)(\d{2})(\d{2})(\d{2})\d{7}$/;
  const match = nationalId.match(regex);

  if (!match) return false;

  const century = match[1] === '2' ? 1900 : 2000;
  const year = parseInt(match[2], 10);
  const month = parseInt(match[3], 10);
  const day = parseInt(match[4], 10);

  const fullYear = century + year;

  const date = new Date(fullYear, month - 1, day);
  const isValidDate =
    date.getFullYear() === fullYear &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  return isValidDate;
 
}

const registerUser = async (req, res) => {
  const { email, password, national_id, first_name, last_name, phone } = req.body;

  if (!email || !password || !national_id || !first_name || !last_name || !phone) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

    if (!isValidEgyptianNationalId(national_id)) {
    return res.status(400).json({ error: 'National ID is not valid.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-={}[\]|\\:;"'<>,./?]).{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      error:
        'Password must be at least 8 characters long and include at least one uppercase letter, one number, and one special character.',
    });
  }

  // ✅ Egyptian National ID Validation
  if (!isValidEgyptianNationalId(national_id)) {
    return res.status(400).json({ error: 'Invalid Egyptian national ID.' });
  }

  try {
    const result = await registerUserService(req.body);
    res.status(201).json({
      message: 'User registered successfully',
      ...result,
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const result = await loginUserService({ email, password });
    res.status(200).json({
      message: 'Login successful',
      ...result,
    });
  } catch (error) {
    console.error('Login Error:', error);
    if (error.message === 'INVALID_CREDENTIALS') {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    res.status(500).json({ error: 'Internal server error.' });
  }
};

module.exports = {
  registerUser,
  loginUser,
};
