import winston from 'winston';
import path from 'path';

// Log formatları
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
  })
);

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Log transportlar
const transports: winston.transport[] = [
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat
  })
];

// Production'da dosya logging'i ekle
if (process.env.NODE_ENV === 'production') {
  const logDir = process.env.LOG_FILE_PATH || './logs';
  
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
}

// Logger oluştur
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  transports,
  exceptionHandlers: [
    new winston.transports.Console({
      format: logFormat
    })
  ],
  rejectionHandlers: [
    new winston.transports.Console({
      format: logFormat
    })
  ]
});

// Geliştirme ortamında daha ayrıntılı logging
if (process.env.NODE_ENV === 'development') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
} 