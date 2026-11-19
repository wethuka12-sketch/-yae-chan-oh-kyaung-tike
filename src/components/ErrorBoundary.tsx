import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error): void {
    console.error('Application ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF6EE] text-[#2A1815] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-[#3D140F]/15 rounded-2xl p-6 shadow-sm text-center space-y-4">
            <h2 className="text-xl font-semibold text-[#3D140F]">
              ရေချမ်းအိုးကျောင်းတိုက်
            </h2>
            <p className="text-sm text-[#5C4038] leading-relaxed">
              စနစ်အတွင်း ယာယီအခက်အခဲ ဖြစ်ပေါ်နေပါသည်။ ကျေးဇူးပြု၍ စာမျက်နှာကို ပြန်လည်စတင်ပေးပါ။
            </p>
            <p className="text-xs text-[#7D635B] break-words bg-[#FAF6EE] p-3 rounded-xl border border-[#3D140F]/10">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#3D140F] text-[#FAF6EE] text-sm font-medium hover:bg-[#521C15] transition-colors cursor-pointer"
            >
              ပြန်လည်စတင်ရန် (Reload)
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
