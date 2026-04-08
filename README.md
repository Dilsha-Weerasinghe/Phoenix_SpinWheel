# Daily Spin Wheel Application

A fully functional web-based Spin Wheel application with a Node.js + MongoDB backend that ensures 30 prizes are smoothly distributed across an approximate 7-hour timeframe.

## Requirements
- Node.js (v14+ recommended)
- MongoDB instance running locally (port 27017) or accessible via URI.

## Installation & Setup

1. **Clone or Download the Repository**
2. **Navigate to the Backend Directory:**
   ```bash
   cd backend
   ```
3. **Install Dependencies:**
   ```bash
   npm install
   ```
4. **Environment Variables:** (Optional)
   You can create a `.env` file in the `backend` directory to override defaults:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/spinwheel
   ```

## Running the Application

1. Ensure your MongoDB service is running on your machine.
2. Start the Backend Server:
   ```bash
   node server.js
   ```
3. Open your browser on your Android TV or any device to:
   ```
   http://localhost:3000
   ```
   *The server acts as both the robust API and static file host for the frontend to prevent any configuration CORS issues.*

## Key Features

*   **Dynamic Probability Engine**: Evaluates time passed since the first spin of the day and compares it to the remaining prizes to intelligently scale win probabilities preventing early depletion or massive leftovers.
*   **MongoDB Storage**: Automatically records daily progress cleanly without manual campaign setup.
*   **Android TV Ready UI**: Designed natively as a fullscreen, high-contrast, large-hitbox application with smooth CSS transformation easing.

## Testing Probability (Simulator)
Run the built-in simulator to see exactly how the prizes are algorithmically distributed over 5000 spins spanning 7.5 simulated hours.
```bash
node simulator.js
```
