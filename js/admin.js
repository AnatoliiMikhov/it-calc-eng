// js/admin.js

document.addEventListener('DOMContentLoaded', () => {
    const loadingIndicator = document.getElementById('loading');
    const ratesForm = document.getElementById('rates-form');
    const authMessage = document.getElementById('auth-message'); // We bring this back for simplicity

    // --- Helper Functions ---
    const showLoading = () => {
        authMessage.classList.add('hidden');
        ratesForm.classList.add('hidden');
        loadingIndicator.classList.remove('hidden');
    };

    const showForm = () => {
        authMessage.classList.add('hidden');
        loadingIndicator.classList.add('hidden');
        ratesForm.classList.remove('hidden');
    };

    const showLoginMessage = () => {
        ratesForm.classList.add('hidden');
        loadingIndicator.classList.add('hidden');
        authMessage.classList.remove('hidden');
    };

    // --- Data Fetching ---
    const fetchRates = async () => {
        try {
            const response = await fetch('/.netlify/functions/getRates');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const rates = await response.json();
            
            // Populate the form with the fetched data
            const populateForm = (data) => {
                for (const key in data) {
                    if (typeof data[key] === 'object' && data[key] !== null) {
                        for (const subKey in data[key]) {
                            const inputName = `${key}.${subKey}`;
                            const inputElement = ratesForm.querySelector(`[name="${inputName}"]`);
                            if (inputElement) {
                                inputElement.value = data[key][subKey];
                            }
                        }
                    } else {
                        const inputElement = ratesForm.querySelector(`[name="${key}"]`);
                        if (inputElement) {
                            inputElement.value = data[key];
                        }
                    }
                }
            };
            
            populateForm(rates);
            showForm();

        } catch (error) {
            console.error('Failed to fetch rates:', error);
            loadingIndicator.textContent = 'Failed to load rates. Please try refreshing.';
        }
    };

    // --- Form Submission ---
    ratesForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitButton = ratesForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.textContent = 'Saving...';
        submitButton.disabled = true;

        const formData = new FormData(ratesForm);
        const newRates = { project: {}, design: {}, modules: {} };

        for (const [key, value] of formData.entries()) {
            // Input validation for non-negative numbers
            const numValue = parseFloat(value);
            if (isNaN(numValue) || numValue < 0) {
                alert('Invalid input: All values must be non-negative numbers.');
                submitButton.textContent = originalButtonText;
                submitButton.disabled = false;
                return;
            }

            if (key.includes('.')) {
                const [category, subKey] = key.split('.');
                newRates[category][subKey] = numValue;
            } else {
                newRates[key] = numValue;
            }
        }

        const user = netlifyIdentity.currentUser();
        const token = user ? await user.jwt() : null;

        if (!token) {
            alert('Authentication error. Please refresh and log in again.');
            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
            return;
        }

        try {
            const response = await fetch('/.netlify/functions/updateRates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newRates)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Server error');
            }
            
            submitButton.textContent = 'Saved!';
            setTimeout(() => {
                submitButton.textContent = originalButtonText;
            }, 2000);

        } catch (error) {
            console.error('Failed to update rates:', error);
            alert(`Failed to save rates: ${error.message}`);
            submitButton.textContent = originalButtonText;
        } finally {
            submitButton.disabled = false;
        }
    });

    // --- Authentication Logic ---
    
    // This is the most reliable way: check the user state right away.
    const user = netlifyIdentity.currentUser();
    if (user && user.app_metadata?.roles?.includes('admin')) {
        showLoading();
        fetchRates();
    } else {
        showLoginMessage();
    }

    // To solve the race condition reliably, we revert to the simple and effective
    // page reload strategy from the original project.
    netlifyIdentity.on('login', () => {
        location.reload();
    });

    netlifyIdentity.on('logout', () => {
        location.reload();
    });
});