export interface ModuleContext {
  env: AppEnv;
}

export interface AppModule<TApi> {
  id: string;
  init(ctx: ModuleContext): Promise<TApi>;
  dispose(): Promise<void>;
}

export interface AppEnv {
  firebaseApiKey: string;
  firebaseAuthDomain: string;
  firebaseProjectId: string;
  firebaseDatabaseUrl: string;
  firebaseStorageBucket: string;
  firebaseMessagingSenderId: string;
  firebaseAppId: string;
  useEmulators: boolean;
}
