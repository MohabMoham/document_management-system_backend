const { PrismaClient } = require('../generated/prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;


async function getUserNID(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { nationalId: true }
  });
  return user?.nationalId;
}

const registerUser = async (data) => {
  const { email, password, national_id, first_name, last_name, phone } = data;

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      nationalId: national_id,
      firstName: first_name,
      lastName: last_name,
      phone,
      role: 'user'
    },
  });

  const token = jwt.sign(
    { userId: user.id, email: user.email ,role: user.role,userNID: user.nationalId },
    JWT_SECRET,
    { expiresIn: '90d' }
  );

  const { password: _, ...userWithoutPassword } = user;

  return { token, user: userWithoutPassword };
};

const loginUser = async (data) => {
  const { email, password } = data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('INVALID_CREDENTIALS');

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) throw new Error('INVALID_CREDENTIALS');

  const token = jwt.sign(
    { userId: user.id, email: user.email , role: user.role},
    JWT_SECRET,
    { expiresIn: '90d' }
  );

  const { password: _, ...userWithoutPassword } = user;

  return { token, user: userWithoutPassword };
};

module.exports = {
  getUserNID,
  registerUser,
  loginUser
};
