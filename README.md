# DeepWork

DeepWork is an accountability-focused task management application designed to help users follow through on important commitments.

Users can create normal tasks or high-stakes tasks. High-stakes tasks require the user to put money at stake through Razorpay. Completing the task before the deadline returns the stake, while failing the task transfers the stake to the selected recipient.

The application also includes an AI-powered accountability analyst that examines task history and identifies patterns in the user's productivity and failures.

## Features

- Create and manage normal tasks
- Create high-stakes accountability tasks
- Set deadlines and allocated time
- Track task completion
- Automatic task status updates
- Razorpay test payments for high-stakes tasks
- Mock payout/refund flow for testing
- Background scheduler for deadline-based task processing
- AI analysis based on actual task history
- AI-generated suggestions for improving accountability
- Task filtering by time period and type
- Dashboard with productivity statistics
- Google authentication
- JWT-based authentication
- REST API built with FastAPI

## Tech Stack

### Frontend

- React
- Vite
- Axios
- React Router
- Tailwind CSS

### Backend

- Python
- FastAPI
- SQLAlchemy
- PostgreSQL
- Pydantic
- JWT Authentication

### AI

- Google Gemini
- AI accountability analysis using task history and tool-based analysis

### Payments

- Razorpay Test API

## Project Structure

```text
DeepWork/
│
├── backend/
│   ├── venv/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── payout_service.py
│   ├── scheduler.py
│   ├── razorpay_client.py
│   ├── ai_agent.py
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
│
└── README.md
```

## How It Works

### Normal Tasks

Normal tasks work like a standard task management system.

1. The user creates a task.
2. The user sets a deadline and other task details.
3. The task starts as `in_progress`.
4. The user can mark the task as completed before the deadline.
5. If the deadline passes without completion, the task becomes `failed`.

### High-Stakes Tasks

High-stakes tasks add financial accountability to the process.

1. The user creates a high-stakes task.
2. The user selects a recipient.
3. The user chooses an amount to stake.
4. The user makes the payment through Razorpay.
5. The task becomes active after successful payment.
6. If the task is completed before the deadline, the stake is returned to the user.
7. If the deadline passes without completion, the stake is transferred to the selected recipient.

The current implementation uses Razorpay's test environment and mock payout/refund logic for development.

## AI Accountability Analyst

DeepWork includes an AI-powered accountability analyst that analyzes the user's task history.

The AI can inspect individual task titles, descriptions, types, statuses, deadlines, and completion information to identify meaningful patterns.

The AI can analyze things such as:

- Repeatedly failed task categories
- Categories where the user consistently succeeds
- Differences between normal and high-stakes tasks
- Repeated commitments
- Workload and possible overcommitment
- Deadline patterns
- Task timing
- Completion behavior
- Potential productivity patterns

The AI returns:

- A short accountability insight
- A title and emoji
- Actionable suggestions

The AI is designed to distinguish observations from explanations and avoid inventing patterns that are not supported by the user's task history.

## API

The backend exposes REST endpoints through FastAPI.

Once the backend is running, interactive API documentation is available at:

```text
http://localhost:8000/docs
```

The API includes functionality for:

- Authentication
- Task creation
- Task retrieval
- Task updates
- Task completion
- Task deletion
- Task statistics
- High-stakes tasks
- Payment handling
- AI insights

## Running Locally

### Prerequisites

Make sure the following are installed:

- Python
- Node.js and npm
- PostgreSQL

### 1. Clone the Repository

```bash
git clone <repository-url>
cd DeepWork
```

### 2. Set Up PostgreSQL

Make sure PostgreSQL is installed and the PostgreSQL server is running.

Create a database named:

```text
deepwork
```

The backend expects PostgreSQL to be running locally on port `5432`.

### 3. Set Up the Backend

Navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate it.

**Windows:**

```bash
venv\Scripts\activate
```

**macOS/Linux:**

```bash
source venv/bin/activate
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file in the backend directory using `.env.example` as a reference.

Start the backend:

```bash
uvicorn main:app --host localhost --port 8000 --reload
```

The API will be available at:

```text
http://localhost:8000
```

FastAPI's interactive API documentation will be available at:

```text
http://localhost:8000/docs
```

### 4. Set Up the Frontend

Open another terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install the dependencies:

```bash
npm install
```

Create a `.env` file using `.env.example` as a reference.

Start the development server:

```bash
npm run dev
```

Open the URL provided by Vite in your browser.

## Environment Variables

### Backend

Create:

```text
backend/.env
```

using:

```text
backend/.env.example
```

as a reference.

Example:

```env
DATABASE_PASSWORD=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite
SECRET_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

### Frontend

Create:

```text
frontend/.env
```

using:

```text
frontend/.env.example
```

as a reference.

Example:

```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
```

Do not commit `.env` files or API keys to the repository.

## Database

DeepWork uses PostgreSQL with SQLAlchemy.

The backend expects a PostgreSQL database named:

```text
deepwork
```

running locally on:

```text
localhost:5432
```

The database connection is configured through the `DATABASE_PASSWORD` environment variable.

## Authentication

DeepWork uses JWT-based authentication for protected backend endpoints.

The frontend sends the access token with API requests using the `Authorization` header.

Protected requests use:

```text
Authorization: Bearer <access_token>
```

Google authentication is used as the authentication provider on the frontend.

## Payments

High-stakes tasks use Razorpay for payment processing.

The project currently uses the Razorpay test environment for development.

The payment flow is:

```text
Create High-Stakes Task
        ↓
Select Recipient
        ↓
Choose Stake
        ↓
Razorpay Payment
        ↓
Task Becomes Active
        ↓
       ┌───────────────┐
       │               │
   Completed        Deadline
   Before Due       Reached
       │               │
       ↓               ↓
    Refund          Payout
    to User       to Recipient
```

Actual production payouts and refunds are not currently being used. The project includes mock payout/refund functionality for testing the accountability flow without moving real money.

## Task Lifecycle

Tasks generally follow this lifecycle:

```text
in_progress
     │
     ├── completed before deadline
     │
     └── failed after deadline
```

The backend scheduler checks deadlines and updates tasks that have passed their deadline without being completed.

## Scheduler

DeepWork includes a background scheduler responsible for deadline-based task processing.

It handles tasks whose deadlines have passed and updates their status accordingly.

This ensures that a task can transition from:

```text
in_progress → failed
```

when its deadline is reached without completion.

## AI Insight Flow

The AI insight system works roughly as follows:

```text
User Dashboard
      ↓
POST /ai/insight
      ↓
FastAPI Backend
      ↓
Retrieve User's Tasks
      ↓
Accountability Analyst
      ↓
Task Analysis Tools
      ↓
Gemini
      ↓
Insight + Suggestions
      ↓
Dashboard
```

The accountability analyst can use multiple tools to understand the user's behavior:

- `get_task_summary`
- `get_task_history`
- `get_failure_analysis`
- `get_focus_tasks`

This allows the AI to reason from the user's actual task data instead of relying only on hardcoded statistics.

## Development Notes

- PostgreSQL must be running locally for the backend to connect to the database.
- Razorpay is currently configured for the test environment.
- High-stakes payout/refund behavior currently uses mock logic for development.
- The AI accountability analysis requires a valid Gemini API key.
- The application is currently intended for local development and experimentation.
- Environment variables should never be committed to the repository.

## Future Improvements

Possible future improvements include:

- Production payment and payout handling
- Webhook-based Razorpay payment verification
- More detailed productivity analytics
- Improved AI accountability analysis
- More task categories and filters
- Notifications and reminders
- Email notifications
- Mobile support
- Deployment to a production environment
- Improved error handling and monitoring
- Automated testing
- More granular user and recipient management

## License

This project is currently intended for development and experimentation.
