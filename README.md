# Get Embed! - Embeddings Playground

An advanced embeddings playground for exploring OpenAI and Hugging Face embedding models through interactive text analysis and visualization.

## Features

- **Text Comparison Table**: Upload CSV files with query text, stored text, and related status columns
- **4 Embedding Models**: 
  - OpenAI: text-embedding-3-small, text-embedding-3-large, text-embedding-ada-002
  - Hugging Face: BAAI/bge-small-en-v1.5
- **Distance Analysis**: Automatic cosine distance calculation between text pairs
- **Statistical Visualization**: Box plots showing distribution overlap between related and unrelated distances
- **Threshold Analysis**: Optimal threshold calculation with "Related?" checkboxes
- **CSV Export**: Download results with model names as headers and threshold values

## Prerequisites

- Node.js 18+ 
- npm or yarn package manager

## Required API Keys

You need the following API keys to run the application:

1. **OpenAI API Key** - For OpenAI embedding models
   - Get from: https://platform.openai.com/api-keys
   - Required for: text-embedding-3-small, text-embedding-3-large, text-embedding-ada-002

2. **Hugging Face API Key** - For Hugging Face models
   - Get from: https://huggingface.co/settings/tokens
   - Required for: BAAI/bge-small-en-v1.5

## Local Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/samhld/Embeddings-Playground.git
   cd Embeddings-Playground
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```bash
   touch .env
   ```
   
   Add your API keys to the `.env` file:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   HUGGINGFACE_API_KEY=your_huggingface_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Open your browser to: http://localhost:5000
   - The application serves both frontend and backend on the same port

## Usage

### CSV Upload Format

Upload a CSV file with these columns:
- **Query Text**: The text to compare against
- **Stored Text**: The text to be compared
- **Related**: "Yes", "Related", or any truthy value for related pairs

Example CSV:
```csv
Query Text,Stored Text,Related
"How to cook pasta","Boiling water for noodles",Yes
"Weather forecast","Stock market trends",No
"Machine learning","Artificial intelligence",Related
```

### Using the Interface

1. **Upload CSV**: Click "Upload CSV" and select your file
2. **Select Models**: Choose which embedding models to test
3. **Calculate Distances**: Click "Calculate All Distances" to process all pairs
4. **View Analysis**: Click "Plot Data" to see statistical distributions
5. **Export Results**: Click "Download CSV" to save results with calculated distances

### Box Plot Analysis

The visualization shows:
- **Blue boxes**: Related text pair distances  
- **Red boxes**: Unrelated text pair distances
- **Overlap analysis**: Where boxes overlap indicates threshold optimization opportunities
- **Statistical metrics**: Min, Q1, Median, Q3, Max values for each model

## Development

### Project Structure
```
├── client/src/          # React frontend
├── server/              # Express backend  
├── shared/              # Shared types and schemas
├── package.json         # Dependencies and scripts
└── vite.config.ts       # Build configuration
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - TypeScript type checking

### Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, TypeScript
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Build Tool**: Vite

## Troubleshooting

### Common Issues

1. **API Key Errors**
   - Ensure your `.env` file contains valid API keys
   - Check that the keys have proper permissions
   - Verify the `.env` file is in the root directory

2. **Port Already in Use**
   - The app runs on port 5000 by default
   - Kill other processes using port 5000 or change the port in server configuration

3. **Module Not Found Errors**
   - Run `npm install` to ensure all dependencies are installed
   - Delete `node_modules` and run `npm install` again if issues persist

4. **Build Errors**
   - Run `npm run check` to identify TypeScript errors
   - Ensure Node.js version is 18 or higher

### Getting Help

If you encounter issues:
1. Check the console for error messages
2. Verify your API keys are valid and have sufficient credits
3. Ensure all dependencies are properly installed
4. Check that your CSV format matches the expected structure

## License

MIT License