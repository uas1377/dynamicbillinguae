// List of valid ISO 4217 currency codes we support
const VALID_CURRENCY_CODES = ['AED', 'USD', 'EUR', 'GBP', 'INR', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR'];

export const formatCurrency = (amount, currencyCode = 'AED', minimumFractionDigits = 2) => {
  // If currencyCode is not a valid ISO code, format as plain number with prefix
  if (!VALID_CURRENCY_CODES.includes(currencyCode)) {
    const formattedNumber = new Intl.NumberFormat('en-US', { 
      minimumFractionDigits, 
      maximumFractionDigits: minimumFractionDigits 
    }).format(amount);
    return `${currencyCode} ${formattedNumber}`;
  }
  
  const locale = currencyCode === 'USD' ? 'en-US' : 'en-AE';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode, minimumFractionDigits }).format(amount);
};

export const getCurrencySymbol = (currencyCode = 'AED') => {
  if (!VALID_CURRENCY_CODES.includes(currencyCode)) {
    return currencyCode;
  }
  return formatCurrency(0, currencyCode).replace(/[\d.,\s]/g, '');
};
