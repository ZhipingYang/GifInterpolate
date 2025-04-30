export type LogLevel = 'info' | 'warning' | 'error' | 'debug';

export interface LogEntry {
  id: number;
  timestamp: number;
  message: string;
  level: LogLevel;
  details?: any;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private logListeners: ((logs: LogEntry[]) => void)[] = [];
  private nextId = 1;
  private maxLogs = 1000; // Maximum number of logs to keep

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public info(message: string, details?: any): void {
    this.log('info', message, details);
  }

  public warning(message: string, details?: any): void {
    this.log('warning', message, details);
  }

  public error(message: string, details?: any): void {
    this.log('error', message, details);
    console.error(message, details);
  }

  public debug(message: string, details?: any): void {
    this.log('debug', message, details);
  }

  private log(level: LogLevel, message: string, details?: any): void {
    const logEntry: LogEntry = {
      id: this.nextId++,
      timestamp: Date.now(),
      message,
      level,
      details
    };

    this.logs.push(logEntry);

    // Trim logs if exceeding max limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Notify listeners
    this.notifyListeners();

    // Also log to console (except debug in production)
    if (level !== 'debug' || process.env.NODE_ENV !== 'production') {
      console[level === 'warning' ? 'warn' : level](message, details);
    }
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
    this.notifyListeners();
  }

  public subscribe(listener: (logs: LogEntry[]) => void): () => void {
    this.logListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.logListeners = this.logListeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    const logs = this.getLogs();
    this.logListeners.forEach(listener => listener(logs));
  }
}

export default Logger.getInstance(); 