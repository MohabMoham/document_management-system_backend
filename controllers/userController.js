const {
  registerUser,
  loginUser,
} = require('../services/auth.service');

const {
  emailRegex,
  passwordRegex,
  isValidEgyptianNationalId,
} = require('../utils/authValidations');

const register = async (req, res) => {
  const { email, password, national_id, first_name, last_name, phone } = req.body;

  if (!email || !password || !national_id || !first_name || !last_name || !phone) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  if (!isValidEgyptianNationalId(national_id)) {
    return res.status(400).json({ error: 'National ID is not valid.' });
  }

  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      error:
        'Password must be at least 8 characters long and include at least one uppercase letter, one number, and one special character.',
    });
  }

  try {
    const result = await registerUser(req.body);
    res.status(201).json({
      message: 'User registered successfully',
      ...result,
    });
  } catch (error) {
   
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const result = await loginUser({ email, password });

    
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, 
    });

    res.status(200).json({
      message: 'Login successful',
      ...result,
    });
  } catch (error) {
   
    if (error.message === 'INVALID_CREDENTIALS') {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    res.status(500).json({ error: 'Internal server error.' });
  }
};


module.exports = {
  register,
  login
};
