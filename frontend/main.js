document.addEventListener('DOMContentLoaded', () => {
    const statusText = document.getElementById('status-text');
    const spinBtn = document.getElementById('spin-btn');
    const wheel = document.getElementById('wheel');
    const resultModal = document.getElementById('result-modal');
    const resultTitle = document.getElementById('result-title');
    const resultDesc = document.getElementById('result-desc');

    let currentRotation = 0;
    let isSpinning = false;
    
    // Express server will serve static files, so API is on same host.
    const API_BASE = '/api';

    async function checkStatus() {
        try {
            const res = await fetch(`${API_BASE}/get-status`);
            const data = await res.json();
            
            if (data.success) {
                const { remainingPrizes } = data.data;
                
                if (remainingPrizes > 0) {
                    if (!isSpinning) {
                        statusText.innerText = '';
                        spinBtn.disabled = false;
                        spinBtn.innerText = 'SPIN';
                    }
                } else {
                    spinBtn.disabled = true;
                    spinBtn.innerText = 'DONE';
                    statusText.innerText = 'All prizes for today have been claimed!';
                }
            } else {
                statusText.innerText = 'Error loading status.';
            }
        } catch (error) {
            console.error('Error fetching status:', error);
            statusText.innerText = 'Cannot connect to server. Retrying...';
            setTimeout(checkStatus, 3000);
        }
    }

    checkStatus();

    spinBtn.addEventListener('click', async () => {
        if (isSpinning) return;
        isSpinning = true;
        spinBtn.disabled = true;
        statusText.innerText = '';

        try {
            // Wait for API result before deciding where to spin
            const res = await fetch(`${API_BASE}/spin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();

            if (data.success) {
                const { isWin, prize, segmentIndex } = data.result;

                const prizeNames = {
                    'tshirt': 'a T-Shirt',
                    'cap': 'a Cap',
                    'shoe_rack': 'a Shoe Rack'
                };

                const prizeImages = {
                    'tshirt': 'https://i.postimg.cc/Hk11zsJh/imgi-240-standard-plain-round-neck-shirt-white-3f96896d-60d3-4b52-b0d2-dfc42cf1462b-large.png',
                    'cap': 'https://i.postimg.cc/ZRjv4MNR/Untitled-design-removebg-preview-(3).png',
                    'shoe_rack': 'https://i.postimg.cc/nhW7ggJ0/Whats-App-Image-2026-04-07-at-4-44-07-PM-removebg-preview.png'
                };

                const spins = 8; // spin fast
                const degreesPerSegment = 60;
                
                const targetMod = (360 - (segmentIndex * degreesPerSegment)) % 360;
                const currentMod = currentRotation % 360;
                
                let diff = targetMod - currentMod;
                if (diff < 0) diff += 360;
                
                const randomOffset = (Math.random() * 40) - 20;

                const additionalRotation = (spins * 360) + diff + randomOffset;
                currentRotation += additionalRotation;

                wheel.style.transform = `rotate(${currentRotation}deg)`;

                setTimeout(() => {
                    const desc = prize ? prizeNames[prize] : null;
                    const img = prize ? prizeImages[prize] : null;
                    showResult(isWin, desc, img);
                    checkStatus();
                    isSpinning = false;
                }, 5200);
                
            } else {
                statusText.innerText = 'Error occurred during spin. Try again.';
                isSpinning = false;
                spinBtn.disabled = false;
            }

        } catch (error) {
            console.error('Error spinning:', error);
            statusText.innerText = 'Network error. Try again.';
            isSpinning = false;
            spinBtn.disabled = false;
        }
    });

    const resultImage = document.getElementById('prize-image');
    const modalActionBtn = document.getElementById('modal-action-btn');

    function showResult(isWin, prizeDesc, prizeImg) {
        if (isWin) {
            resultTitle.innerText = '🎉 You Won! 🎉';
            resultTitle.style.color = '#FFD700';
            resultDesc.innerText = `You have won ${prizeDesc}!`;
            if (prizeImg) {
                resultImage.src = prizeImg;
                resultImage.style.display = 'block';
            } else {
                resultImage.style.display = 'none';
            }
            modalActionBtn.innerText = 'Awesome!';
        } else {
            resultTitle.innerText = 'GAME OVER';
            resultTitle.style.color = '#dd5a26';
            resultDesc.innerText = 'Better luck next time!';
            resultImage.style.display = 'none';
            modalActionBtn.innerText = 'OK';
        }
        resultModal.classList.add('active');
    }

    window.closeModal = () => {
        resultModal.classList.remove('active');
    };
});
