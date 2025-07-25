// js/admin.js
document.addEventListener('DOMContentLoaded', () => {
    const authMessage = document.getElementById('auth-message');
    const loadingMessage = document.getElementById('loading');
    const ratesForm = document.getElementById('rates-form');
    const saveButton = ratesForm.querySelector('button[type="submit"]');

    // Function to show/hide elements
    const toggleVisibility = (element, show) => {
        if (element) {
            element.classList.toggle('hidden', !show);
        }
    };

    // Function to display a message (e.g., success or error)
    const displayMessage = (message, isError = false) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isError ? 'error' : 'success'}`;
        messageDiv.textContent = message;
        messageDiv.style.padding = '1rem';
        messageDiv.style.marginTop = '1rem';
        messageDiv.style.borderRadius = '5px';
        messageDiv.style.textAlign = 'center';
        messageDiv.style.fontWeight = 'bold';
        messageDiv.style.backgroundColor = isError ? '#ffebee' : '#e8f5e9';
        messageDiv.style.color = isError ? '#c62828' : '#2e7d32';
        ratesForm.parentNode.insertBefore(messageDiv, ratesForm.nextSibling);

        // Remove message after a few seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    };

    // Function to fetch rates from the Netlify function
    const fetchRates = async () => {
        toggleVisibility(loadingMessage, true); // Show loading message
        toggleVisibility(ratesForm, false); // Hide form

        try {
            const response = await fetch('/.netlify/functions/getRates');
            const data = await response.json();

            if (response.ok) {
                // Populate the form with fetched rates
                for (const key in data) {
                    if (typeof data[key] === 'object' && data[key] !== null) {
                        // Handle nested objects (project, design, modules)
                        for (const subKey in data[key]) {
                            const input = document.getElementById(`${key}-${subKey}`);
                            if (input) {
                                input.value = data[key][subKey];
                            }
                        }
                    } else {
                        // Handle top-level keys (hourlyRate)
                        const input = document.getElementById(key);
                        if (input) {
                            input.value = data[key];
                        }
                    }
                }
                toggleVisibility(ratesForm, true); // Show form after loading data
            } else {
                displayMessage(`Error loading rates: ${data.message || 'Unknown error'}`, true);
                console.error('Failed to fetch rates:', data.message);
            }
        } catch (error) {
            displayMessage(`Network error: ${error.message}`, true);
            console.error('Network error fetching rates:', error);
        } finally {
            toggleVisibility(loadingMessage, false); // Hide loading message
        }
    };

    // Function to handle form submission
    const handleFormSubmit = async (event) => {
        event.preventDefault(); // Prevent default form submission
        saveButton.disabled = true; // Disable button to prevent multiple submissions
        saveButton.textContent = 'Saving...';

        // Collect form data
        const formData = new FormData(ratesForm);
        const rates = {};

        // Parse form data into a nested object structure
        for (const [key, value] of formData.entries()) {
            const parts = key.split('.');
            let current = rates;
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (i === parts.length - 1) {
                    // Convert value to number, ensure it's not negative
                    const numValue = parseFloat(value);
                    if (isNaN(numValue) || numValue < 0) {
                        displayMessage(`Invalid input for ${key}: Must be a non-negative number.`, true);
                        saveButton.disabled = false;
                        saveButton.textContent = 'Save Changes';
                        return; // Stop submission if validation fails
                    }
                    current[part] = numValue;
                } else {
                    if (!current[part]) {
                        current[part] = {};
                    }
                    current = current[part];
                }
            }
        }

        try {
            const response = await fetch('/.netlify/functions/updateRates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(rates),
            });
            const data = await response.json();

            if (response.ok) {
                displayMessage('Rates updated successfully!', false);
                console.log('Rates updated:', data.message);
            } else {
                displayMessage(`Error updating rates: ${data.message || 'Unknown error'}`, true);
                console.error('Failed to update rates:', data.message);
            }
        } catch (error) {
            displayMessage(`Network error: ${error.message}`, true);
            console.error('Network error updating rates:', error);
        } finally {
            saveButton.disabled = false; // Re-enable button
            saveButton.textContent = 'Save Changes';
        }
    };

    // Netlify Identity event listener
    netlifyIdentity.on('init', user => {
        if (user) {
            // User is logged in
            toggleVisibility(authMessage, false); // Hide login message
            // Check if user has 'admin' role
            const roles = user.app_metadata.roles || [];
            if (roles.includes('admin')) {
                fetchRates(); // Fetch rates if admin
            } else {
                displayMessage('You do not have administrative privileges to access this panel.', true);
                toggleVisibility(loadingMessage, false); // Hide loading
                toggleVisibility(ratesForm, false); // Ensure form is hidden
            }
        } else {
            // User is not logged in
            toggleVisibility(authMessage, true); // Show login message
            toggleVisibility(loadingMessage, false); // Hide loading
            toggleVisibility(ratesForm, false); // Hide form
        }
    });

    // Add event listener for form submission
    ratesForm.addEventListener('submit', handleFormSubmit);

    // Initialize Netlify Identity widget
    netlifyIdentity.init();
});