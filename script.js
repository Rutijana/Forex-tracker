// API Configuration
const API_BASE_URL = 'https://currency-conversion-and-exchange-rates.p.rapidapi.com/';
const API_HOST = 'currency-conversion-and-exchange-rates.p.rapidapi.com';
const API_KEY = '2514ab7fd9mshf6e37671e957747p17800bjsnc2e9078989db';

// DOM Elements
const amountInput = document.getElementById('amount');
const fromCurrencySelect = document.getElementById('from-currency');
const toCurrencySelect = document.getElementById('to-currency');
const swapBtn = document.getElementById('swap-currencies');
const convertBtn = document.getElementById('convert-btn');
const conversionResult = document.getElementById('conversion-result');
const conversionDetails = document.getElementById('conversion-details');
const lastUpdated = document.getElementById('last-updated');
const baseCurrencySelect = document.getElementById('base-currency');
const currencySearch = document.getElementById('currency-search');
const sortAlphabeticalBtn = document.getElementById('sort-alphabetical');
const sortByValueBtn = document.getElementById('sort-by-value');
const ratesTableBody = document.getElementById('rates-body');
const footerUpdateTime = document.getElementById('footer-update-time');
const errorModal = document.getElementById('error-modal');
const errorMessage = document.getElementById('error-message');
const closeModalBtn = document.querySelector('.close-btn');
const historicalChart = document.getElementById('historical-chart');
const historicalRange = document.getElementById('historical-range');

// State
let exchangeRates = {};
let availableCurrencies = [];
let lastUpdateTime = null;
let baseCurrency = 'USD';
let favorites = JSON.parse(localStorage.getItem('currencyFavorites')) || [];
let chart = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
  await fetchAvailableCurrencies();
  await fetchExchangeRates(baseCurrency);
  setupEventListeners();
  updateFooterTime();
});

async function fetchAvailableCurrencies() {
  try {
    const response = await fetch(`${API_BASE_URL}symbols`, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': API_HOST,
        'x-rapidapi-key': API_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.symbols) {
      throw new Error('Invalid response format from API');
    }
    
    availableCurrencies = Object.entries(data.symbols).map(([code, name]) => ({
      code,
      name
    }));
    
    populateCurrencyDropdowns();
  } catch (error) {
    showError(`Failed to fetch currency list: ${error.message}`);
    console.error('Error fetching currency list:', error);
    
    // Fallback to major currencies if API fails
    availableCurrencies = [
      { code: 'USD', name: 'United States Dollar' },
      { code: 'EUR', name: 'Euro' },
      { code: 'GBP', name: 'British Pound Sterling' },
      { code: 'JPY', name: 'Japanese Yen' },
      { code: 'AUD', name: 'Australian Dollar' },
      { code: 'CAD', name: 'Canadian Dollar' },
      { code: 'CHF', name: 'Swiss Franc' },
      { code: 'CNY', name: 'Chinese Yuan' },
      { code: 'SEK', name: 'Swedish Krona' },
      { code: 'NZD', name: 'New Zealand Dollar' }
    ];
    
    populateCurrencyDropdowns();
  }
}

function populateCurrencyDropdowns() {
  // Clear existing options
  fromCurrencySelect.innerHTML = '';
  toCurrencySelect.innerHTML = '';
  baseCurrencySelect.innerHTML = '';
  historicalRange.innerHTML = '<option value="7">Last 7 days</option><option value="30">Last 30 days</option>';
  
  // Add new options
  availableCurrencies.forEach(currency => {
    const option1 = document.createElement('option');
    option1.value = currency.code;
    option1.textContent = `${currency.code} - ${currency.name}`;
    
    const option2 = option1.cloneNode(true);
    const option3 = option1.cloneNode(true);
    
    fromCurrencySelect.appendChild(option1);
    toCurrencySelect.appendChild(option2);
    baseCurrencySelect.appendChild(option3);
    
    // Set default selections
    if (currency.code === 'USD') {
      option1.selected = true;
    }
    if (currency.code === 'EUR') {
      option2.selected = true;
    }
  });
}

async function fetchExchangeRates(base = 'USD') {
  try {
    const response = await fetch(`${API_BASE_URL}latest?base=${base}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': API_HOST,
        'x-rapidapi-key': API_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.rates) {
      throw new Error('Invalid response format from API');
    }
    
    exchangeRates = data.rates;
    lastUpdateTime = new Date(data.timestamp * 1000);
    
    updateUI();
    updateRatesTable();
    fetchHistoricalData(base, toCurrencySelect.value, historicalRange.value);
  } catch (error) {
    showError(`Failed to fetch exchange rates: ${error.message}`);
    console.error('Error fetching exchange rates:', error);
    
    // Fallback data if API fails
    if (Object.keys(exchangeRates).length === 0) {
      exchangeRates = {
        USD: 1,
        EUR: 0.85,
        GBP: 0.73,
        JPY: 110.25,
        AUD: 1.35,
        CAD: 1.26,
        CHF: 0.92,
        CNY: 6.45,
        SEK: 8.55,
        NZD: 1.42
      };
      lastUpdateTime = new Date();
      updateUI();
      updateRatesTable();
    }
  }
}

async function fetchHistoricalData(base, target, days) {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    const formatDate = (date) => date.toISOString().split('T')[0];
    
    const response = await fetch(
      `${API_BASE_URL}timeseries?start_date=${formatDate(startDate)}&end_date=${formatDate(endDate)}&base=${base}&symbols=${target}`, 
      {
        method: 'GET',
        headers: {
          'x-rapidapi-host': API_HOST,
          'x-rapidapi-key': API_KEY
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.rates) {
      throw new Error('Invalid response format from API');
    }
    
    updateHistoricalChart(data.rates, target);
  } catch (error) {
    console.error('Error fetching historical data:', error);
    historicalChart.innerHTML = '<p class="chart-error">Could not load historical data</p>';
  }
}

function updateHistoricalChart(ratesData, targetCurrency) {
  const dates = Object.keys(ratesData).sort();
  const rates = dates.map(date => ratesData[date][targetCurrency]);
  
  if (chart) {
    chart.destroy();
  }
  
  const ctx = document.createElement('canvas');
  historicalChart.innerHTML = '';
  historicalChart.appendChild(ctx);
  
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [{
        label: `${baseCurrency} to ${targetCurrency} Exchange Rate`,
        data: rates,
        borderColor: '#3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#2980b9',
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `1 ${baseCurrency} = ${context.raw.toFixed(4)} ${targetCurrency}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          ticks: {
            callback: function(value) {
              return value.toFixed(4);
            }
          }
        }
      }
    }
  });
}

async function convertCurrency() {
  const amount = parseFloat(amountInput.value);
  const fromCurrency = fromCurrencySelect.value;
  const toCurrency = toCurrencySelect.value;
  
  if (isNaN(amount)) {
    showError('Please enter a valid amount');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}convert?from=${fromCurrency}&to=${toCurrency}&amount=${amount}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': API_HOST,
        'x-rapidapi-key': API_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.result) {
      throw new Error('Invalid response format from API');
    }
    
    conversionResult.textContent = `${amount} ${fromCurrency} = ${data.result.toFixed(4)} ${toCurrency}`;
    conversionDetails.textContent = `1 ${fromCurrency} = ${data.info.rate.toFixed(6)} ${toCurrency}`;
  } catch (error) {
    showError(`Conversion failed: ${error.message}`);
    console.error('Error converting currency:', error);
    
    // Fallback calculation if API fails
    if (exchangeRates[fromCurrency] && exchangeRates[toCurrency]) {
      const rate = exchangeRates[toCurrency] / exchangeRates[fromCurrency];
      const convertedAmount = (amount * rate).toFixed(4);
      
      conversionResult.textContent = `${amount} ${fromCurrency} = ${convertedAmount} ${toCurrency}`;
      conversionDetails.textContent = `1 ${fromCurrency} = ${rate.toFixed(6)} ${toCurrency}`;
    }
  }
}

function swapCurrencies() {
  const temp = fromCurrencySelect.value;
  fromCurrencySelect.value = toCurrencySelect.value;
  toCurrencySelect.value = temp;
  convertCurrency();
}

function updateUI() {
  // Update last updated time
  if (lastUpdateTime) {
    lastUpdated.textContent = `Last updated: ${lastUpdateTime.toLocaleString()}`;
  }
  
  // Set default conversion display
  const fromCurrency = fromCurrencySelect.value;
  const toCurrency = toCurrencySelect.value;
  
  if (exchangeRates[fromCurrency] && exchangeRates[toCurrency]) {
    const rate = exchangeRates[toCurrency] / exchangeRates[fromCurrency];
    conversionResult.textContent = `1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency}`;
  }
}

function updateRatesTable() {
  ratesTableBody.innerHTML = '';
  
  Object.entries(exchangeRates).forEach(([currencyCode, rate]) => {
    if (currencyCode === baseCurrency) return;
    
    const currency = availableCurrencies.find(c => c.code === currencyCode) || { name: currencyCode };
    const isFavorite = favorites.includes(currencyCode);
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${currency.name}</td>
      <td>${currencyCode}</td>
      <td>${rate.toFixed(6)}</td>
      <td>
        <button class="favorite-btn ${isFavorite ? 'favorited' : ''}" data-currency="${currencyCode}">
          <i class="fas fa-star"></i>
        </button>
      </td>
    `;
    
    ratesTableBody.appendChild(row);
  });
  
  // Add event listeners to favorite buttons
  document.querySelectorAll('.favorite-btn').forEach(btn => {
    btn.addEventListener('click', toggleFavorite);
  });
}

function toggleFavorite(e) {
  const currencyCode = e.currentTarget.dataset.currency;
  const index = favorites.indexOf(currencyCode);
  
  if (index === -1) {
    favorites.push(currencyCode);
    e.currentTarget.classList.add('favorited');
  } else {
    favorites.splice(index, 1);
    e.currentTarget.classList.remove('favorited');
  }
  
  localStorage.setItem('currencyFavorites', JSON.stringify(favorites));
}

function filterCurrencies() {
  const searchTerm = currencySearch.value.toLowerCase();
  const rows = ratesTableBody.querySelectorAll('tr');
  
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(searchTerm) ? '' : 'none';
  });
}

function sortAlphabetically() {
  const rows = Array.from(ratesTableBody.querySelectorAll('tr'));
  
  rows.sort((a, b) => {
    const codeA = a.cells[1].textContent;
    const codeB = b.cells[1].textContent;
    return codeA.localeCompare(codeB);
  });
  
  rows.forEach(row => ratesTableBody.appendChild(row));
}

function sortByValue() {
  const rows = Array.from(ratesTableBody.querySelectorAll('tr'));
  
  rows.sort((a, b) => {
    const rateA = parseFloat(a.cells[2].textContent);
    const rateB = parseFloat(b.cells[2].textContent);
    return rateA - rateB;
  });
  
  rows.forEach(row => ratesTableBody.appendChild(row));
}

function showError(message) {
  errorMessage.textContent = message;
  errorModal.style.display = 'flex';
}

function updateFooterTime() {
  const now = new Date();
  footerUpdateTime.textContent = now.toLocaleString();
  
  // Update every minute
  setTimeout(updateFooterTime, 60000);
}

function setupEventListeners() {
  // Converter events
  convertBtn.addEventListener('click', convertCurrency);
  swapBtn.addEventListener('click', swapCurrencies);
  
  // Rates table events
  baseCurrencySelect.addEventListener('change', (e) => {
    baseCurrency = e.target.value;
    fetchExchangeRates(baseCurrency);
  });
  
  currencySearch.addEventListener('input', filterCurrencies);
  sortAlphabeticalBtn.addEventListener('click', sortAlphabetically);
  sortByValueBtn.addEventListener('click', sortByValue);
  
  // Historical data events
  historicalRange.addEventListener('change', () => {
    fetchHistoricalData(baseCurrency, toCurrencySelect.value, historicalRange.value);
  });
  
  toCurrencySelect.addEventListener('change', () => {
    fetchHistoricalData(baseCurrency, toCurrencySelect.value, historicalRange.value);
  });
  
  // Modal events
  closeModalBtn.addEventListener('click', () => {
    errorModal.style.display = 'none';
  });
  
  window.addEventListener('click', (e) => {
    if (e.target === errorModal) {
      errorModal.style.display = 'none';
    }
  });
}