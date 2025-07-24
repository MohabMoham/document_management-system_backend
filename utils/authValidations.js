


const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-={}[\]|\\:;"'<>,./?]).{8,}$/;


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

module.exports = {
  emailRegex,
  passwordRegex,
  isValidEgyptianNationalId,
};
