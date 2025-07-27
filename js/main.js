/* --- DOM Element Selection --- */
const form = document.getElementById('calc-form');
const totalCostElements = {
  top: document.getElementById('top-total-cost'),
  bottom: document.getElementById('total-cost'),
};
const totalTimelineElements = {
  top: document.getElementById('top-total-timeline'),
  bottom: document.getElementById('total-timeline'),
};
const themeToggle = document.getElementById('theme-toggle');
const currentYear = document.getElementById('current-year');

/* --- Modal and Form Elements --- */
const modalOverlay = document.getElementById('modal-overlay');
const openModalBtn = document.getElementById('order-btn');
const closeModalBtn = document.getElementById('modal-close-btn');
const contactForm = document.querySelector('.modal-form');
const callRequestCheckbox = document.getElementById('call-request');
const phoneGroup = document.getElementById('phone-group');

/* --- State Management --- */
let rates = {}; // To store fetched rates
const STORAGE_KEY = 'calculatorState';
let lastCalculatedHours = 0; // To track changes for price indicators

/* --- Utility Functions --- */

/**
 * Formats a number as a currency string (e.g., $1,234).
 * @param {number} amount - The amount to format.
 * @returns {string} - The formatted currency string.
 */
const formatCurrency = (amount) => `$${Math.round(amount).toLocaleString()}`;

/**
 * Formats hours into a timeline string (e.g., "2-3 weeks").
 * @param {number} hours - The total hours.
 * @returns {string} - The formatted timeline string.
 */
const formatTimeline = (hours) => {
  const workHoursPerWeek = 40;
  const weeks = hours / workHoursPerWeek;
  const minWeeks = Math.floor(weeks);
  const maxWeeks = Math.ceil(weeks);

  if (minWeeks === 0 && maxWeeks <= 1) return '< 1 week';
  if (minWeeks === maxWeeks) return `${minWeeks} ${minWeeks === 1 ? 'week' : 'weeks'}`;
  return `${minWeeks}-${maxWeeks} weeks`;
};

/**
 * Updates the displayed total cost and timeline in the UI.
 * @param {number} cost - The total calculated cost.
 * @param {number} timeline - The total calculated hours.
 */
const updateTotals = (cost, timeline) => {
  const formattedCost = formatCurrency(cost);
  const formattedTimeline = formatTimeline(timeline);

  Object.values(totalCostElements).forEach((el) => (el.textContent = formattedCost));
  Object.values(totalTimelineElements).forEach((el) => (el.textContent = formattedTimeline));
};

const saveState = () => {
  const formData = new FormData(form);
  const state = {
    projectType: formData.get('projectType'),
    designType: formData.get('designType'),
    modules: formData.getAll('module'),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const loadState = () => {
  const savedStateJSON = localStorage.getItem(STORAGE_KEY);
  if (!savedStateJSON) return;
  try {
    const savedState = JSON.parse(savedStateJSON);
    if (savedState.projectType)
      form.querySelector(`input[name="projectType"][value="${savedState.projectType}"]`).checked = true;
    if (savedState.designType)
      form.querySelector(`input[name="designType"][value="${savedState.designType}"]`).checked = true;
    if (savedState.modules) {
      savedState.modules.forEach((moduleValue) => {
        const checkbox = form.querySelector(`input[name="module"][value="${moduleValue}"]`);
        if (checkbox) checkbox.checked = true;
      });
    }
  } catch (e) {
    console.error('Failed to load state from localStorage', e);
    localStorage.removeItem(STORAGE_KEY);
  }
};

/**
 * Displays a temporary price/hour change indicator next to an option.
 * @param {HTMLElement} element - The radio or checkbox input element.
 * @param {number} hourDifference - The change in hours (positive or negative).
 */
const showPriceChange = (element, hourDifference) => {
  const optionDiv = element.closest('.option');
  if (!optionDiv) return;

  const priceChangeSpan = optionDiv.querySelector('.price-change');
  if (!priceChangeSpan) return;

  if (hourDifference === 0) return;

  const sign = hourDifference > 0 ? '+' : '';
  priceChangeSpan.textContent = `${sign}${hourDifference}h`;
  priceChangeSpan.className = 'price-change'; // Reset classes
  priceChangeSpan.classList.add(hourDifference > 0 ? 'positive' : 'negative', 'show');

  // Hide the indicator after a short delay
  setTimeout(() => priceChangeSpan.classList.remove('show'), 1500);
};

/* --- Core Calculation Logic --- */

/**
 * Calculates the total cost and hours based on selected form options.
 */
const calculateTotal = () => {
  if (!rates.hourlyRate) return; // Don't calculate if rates aren't loaded

  const formData = new FormData(form);
  let totalHours = 0;

  // 1. Get project type hours
  const projectType = formData.get('projectType');
  if (projectType && rates.project) {
    totalHours += rates.project[projectType] || 0;
  }

  // 2. Get design type hours
  const designType = formData.get('designType');
  if (designType && rates.design) {
    totalHours += rates.design[designType] || 0;
  }

  // 3. Get additional module hours
  const modules = formData.getAll('module');
  if (rates.modules) {
    modules.forEach((module) => {
      totalHours += rates.modules[module] || 0;
    });
  }

  const totalCost = totalHours * rates.hourlyRate;
  updateTotals(totalCost, totalHours);

  // Show price change indicator if an input was the trigger
  const activeElement = document.activeElement;
  if (activeElement && (activeElement.type === 'radio' || activeElement.type === 'checkbox')) {
    const hourDifference = totalHours - lastCalculatedHours;
    showPriceChange(activeElement, hourDifference);
  }

  lastCalculatedHours = totalHours; // Update the last calculated value
  saveState();
};

/* --- Event Handlers --- */

/**
 * Handles theme switching and saves the preference to localStorage.
 */
const handleThemeToggle = () => {
  const isDarkMode = themeToggle.checked;
  document.body.classList.toggle('dark-theme', isDarkMode);
  localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
};

/**
 * Sets the initial theme based on localStorage or system preference.
 */
const setInitialTheme = () => {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    themeToggle.checked = true;
  }
  handleThemeToggle(); // Apply the theme
};

/**
 * Opens the modal window.
 */
const openModal = () => {
  // Populate hidden fields with current calculation
  const cost = totalCostElements.bottom.textContent;
  const timeline = totalTimelineElements.bottom.textContent;

  document.querySelector('input[name="calculated-cost"]').value = cost;
  document.querySelector('input[name="calculated-timeline"]').value = timeline;

  // Gather selected options for the summary
  const formData = new FormData(form);
  const selectedOptions = [];
  formData.forEach((value, key) => {
    const label = document.querySelector(`label[for="${form.elements[key].id || form.elements[key][0].id}"]`);
    if (label) selectedOptions.push(label.textContent.trim());
  });
  document.querySelector('input[name="selected-options"]').value = selectedOptions.join(', ');

  modalOverlay.classList.remove('hidden');
};

/**
 * Closes the modal window.
 */
const closeModal = () => modalOverlay.classList.add('hidden');

/* --- Initialization --- */

/**
 * Fetches the rates from the serverless function and initializes the calculator.
 */
const initializeCalculator = async () => {
  try {
    const response = await fetch('/.netlify/functions/getRates');
    if (!response.ok) throw new Error('Failed to fetch rates');

    rates = await response.json();
    loadState();
    calculateTotal(); // Perform initial calculation
    form.addEventListener('change', calculateTotal);
  } catch (error) {
    console.error('Initialization Error:', error);
    // Display a user-friendly error message
    const container = document.querySelector('.calculator-container');
    container.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <h1>Oops!</h1>
                <p>We couldn't load the calculator settings. Please try refreshing the page.</p>
            </div>
        `;
  }
};

/**
 * Sets up all event listeners for the page.
 */
const setupEventListeners = () => {
  themeToggle.addEventListener('change', handleThemeToggle);
  openModalBtn.addEventListener('click', openModal);
  closeModalBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal(); // Close if clicking on the background
  });
  callRequestCheckbox.addEventListener('change', () => {
    phoneGroup.classList.toggle('hidden', !callRequestCheckbox.checked);
  });
};

/**
 * Main function to run on DOMContentLoaded.
 */
const main = () => {
  currentYear.textContent = new Date().getFullYear();
  setInitialTheme();
  setupEventListeners();
  initializeCalculator();
};

// Run the main function when the document is ready
document.addEventListener('DOMContentLoaded', main);
