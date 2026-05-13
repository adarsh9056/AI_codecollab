import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
          <div className="max-w-md text-center space-y-4 p-8">
            <div className="text-5xl">⚠️</div>
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <p className="text-gray-400 text-sm">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/dashboard';
              }}
              className="px-6 py-2 bg-teal-500 text-black rounded-full font-medium hover:bg-teal-400 transition"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
