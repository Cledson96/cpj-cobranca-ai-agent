export class HealthController {
  async show() {
    return {
      status: "ok",
      service: "cpj-cobranca-ai-agent",
      timestamp: new Date().toISOString(),
    };
  }
}
