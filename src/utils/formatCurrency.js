export const formatCurrency = (amount, currencyCode = 'AED', minimumFractionDigits = 2) => {
  const locale = currencyCode === 'USD' ? 'en-US' : 'en-AE';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode, minimumFractionDigits }).format(amount);
};

export const getCurrencySymbol = (currencyCode = 'AED') => {
  return formatCurrency(0, currencyCode).replace(/[\d.,\s]/g, '');
};
