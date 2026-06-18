import { Button } from '@/components/ui/button';

export default function Welcome({ name = 'User' }: { name?: string }) {
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
            <div className="max-w-2xl w-full text-center space-y-8">
                {/* Logo and Title */}
                <div className="space-y-4">
                    <div className="text-6xl">🤖</div>
                    <h1 className="text-4xl font-bold text-foreground">
                        Welcome to ThinkChat
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        Where ideas meet instant answers.
                    </p>
                </div>

                {/* Feature Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                    <div className="p-6 rounded-lg border border-border bg-card">
                        <div className="text-2xl mb-2">⚡</div>
                        <h3 className="font-semibold text-foreground mb-1">Fast & Modern</h3>
                        <p className="text-sm text-muted-foreground">
                            Built with React 19, Inertia, and Tailwind CSS v4
                        </p>
                    </div>
                    <div className="p-6 rounded-lg border border-border bg-card">
                        <div className="text-2xl mb-2">🎨</div>
                        <h3 className="font-semibold text-foreground mb-1">Beautiful UI</h3>
                        <p className="text-sm text-muted-foreground">
                            Styled with shadcn/ui components and design system
                        </p>
                    </div>
                    <div className="p-6 rounded-lg border border-border bg-card">
                        <div className="text-2xl mb-2">🔗</div>
                        <h3 className="font-semibold text-foreground mb-1">AI Agents</h3>
                        <p className="text-sm text-muted-foreground">
                            Support for multiple AI providers and agents
                        </p>
                    </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                        Get Started
                    </Button>
                    <Button size="lg" variant="outline" className="border-input hover:bg-accent hover:text-accent-foreground">
                        Learn More
                    </Button>
                </div>

                {/* Version Info */}
                <div className="text-sm text-muted-foreground pt-8">
                    <p>Powered by Laravel 13 + React 19 + Inertia + shadcn/ui</p>
                </div>
            </div>
        </div>
    );
}