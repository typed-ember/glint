declare module '@typescript/server-harness' {
  export interface Server {
    on(event: string, callback: (data: any) => void): void;
    send(command: string, args: any): Promise<any>;
  }

  export function launchServer(options: any): Server;
}
