

class AiService {
    // A list of pre-approved, witty lines for ambient chatter.
    private wittyLines: string[] = [
        "Please hold... not that I care if you fall.",
        "Going up? Unlike your paycheck.",
        "If the elevator stops suddenly, just scream louder. That usually fixes it.",
        "For complaints, press 9. Oh wait… this phone doesn’t have a 9.",
        "Your call is very important to us. Just kidding.",
        "Going down… like your chances of winning.",
        "If you feel dizzy, blame the slime, not me.",
        "You pressed the wrong button. Obviously.",
        "For safety instructions… Google it.",
        "Congratulations! You’ve reached… nowhere special.",
    ];

    // A list of pre-approved, generic welcome messages.
    private welcomeMessages: string[] = [
        "Welcome to the Oozevator. Don’t touch anything unless you know what it does.",
    ];
    
    // A list of pre-approved, generic session summaries for the reality check.
    private sessionSummaries: string[] = [
        "Your performance has been logged for corporate review. Don't call us, we'll call you.",
        "An adequate session. The numbers have been crunched. They weren't impressive.",
        "The results are in. Let's just say there's room for improvement.",
        "Performance metrics analyzed. The machine remains unimpressed.",
        "You certainly... clicked some buttons. The data reflects this.",
        "Another session complete. Don't forget to fill out your TPS reports.",
        "We've reviewed your session. It was... a session.",
        "Your efforts have been noted and filed accordingly. Under 'Miscellaneous'.",
        "The numbers don't lie. But they're not exactly singing your praises, either.",
        "Conclusion: You participated. Congratulations.",
        "Your productivity has been measured against the baseline. It was... baseline.",
        "The quarterly review is in. You are meeting expectations. Barely."
    ];
    
    constructor() {
        // Constructor is now empty as there is no API client to initialize.
    }

    /**
     * Returns a random pre-approved welcome message.
     * @returns A promise that resolves to an array containing the greeting.
     */
    async generateInitialGreeting(): Promise<string[]> {
        const randomIndex = Math.floor(Math.random() * this.welcomeMessages.length);
        const message = this.welcomeMessages[randomIndex];
        return Promise.resolve([message]);
    }

    /**
     * Returns a random witty line for ambient flavor from a hardcoded list.
     * @returns A random line string.
     */
    public generateAmbientLine(): string {
        const randomIndex = Math.floor(Math.random() * this.wittyLines.length);
        return this.wittyLines[randomIndex];
    }

    /**
     * Exposes the full set of ambient lines so other services
     * (e.g. audio pre-loader) can iterate and generate assets.
     * Returns a shallow copy to protect the original list.
     */
    public getAllAmbientLines(): string[] {
        return [...this.wittyLines];
    }
    
    /**
     * Returns a random pre-approved session summary.
     * @returns A promise that resolves to a summary string.
     */
    async generateSessionSummary(): Promise<string> {
        const randomIndex = Math.floor(Math.random() * this.sessionSummaries.length);
        const summary = this.sessionSummaries[randomIndex];
        return Promise.resolve(summary);
    }

    /**
     * Exposes the full set of welcome messages so they can be
     * pre-recorded / pre-loaded as audio assets.
     * Returns a shallow copy to avoid external mutation.
     */
    public getAllWelcomeMessages(): string[] {
        return [...this.welcomeMessages];
    }
}

export const aiService = new AiService();