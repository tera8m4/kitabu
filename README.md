# Kitabu

A real-time screen capture and OCR application with global hotkeys for automated screenshot taking and text extraction.

## Overview

Kitabu is a desktop application that combines screen capture, OCR (Optical Character Recognition), and timeline visualization. It consists of a Rust backend server for handling screen capture, OCR processing, and global hotkeys, paired with a React frontend for displaying screenshots and extracted text in a timeline interface.

## Features

- **Global Hotkeys**: Capture screenshots with Alt+A and start audio recording with Alt+R
- **Real-time OCR**: Automatic text extraction from screenshots using PaddleOCR
- **Timeline Interface**: View captured screenshots and extracted text in chronological order
- **WebSocket Communication**: Real-time data transfer between server and client

## Architecture

### Backend (Rust)
- **WebSocket Server**: Runs on `localhost:49156` for real-time communication
- **Global Hotkey Manager**: System-wide keyboard shortcuts for capture functionality
- **OCR Service**: PaddleOCR integration for text extraction from images
- **Notification Service**: Desktop notifications for user feedback

### Frontend (React + TypeScript)
- **Timeline Component**: Displays screenshots and OCR text in chronological order
- **Real-time Updates**: WebSocket integration for live data updates

## Prerequisites

- **Rust**: Latest stable version
- **Node.js**: Version 18+ 
- **Yarn**: Package manager for frontend dependencies
- **ffmpeg**: Desktop audio recording

## Build

1. **Clone the repository**
   ```bash
   git clone https://github.com/tera8m4/kitabu.git
   cd kitabu
   ```

2. **Install backend dependencies**
   ```bash
   cd server
   cargo build
   ```

3. **Install frontend dependencies**
   ```bash
   cd ui
   yarn install
   yarn build
   ```

## Usage
It has been tested only on linux
