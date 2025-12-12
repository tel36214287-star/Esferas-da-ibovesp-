import React, { useEffect, useState, useCallback } from 'react';
import { fetchRealStockData } from './services/geminiService';
import StockBubbles from './components/StockBubbles';
import { StockData } from './types';

function App() {
  const [data, setData] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRealStockData();
      setData(result.data);
      setSources(result.sources);
    } catch (err) {
      setError("Unable to load market data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getSafeHostname = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch (e) {
      return url; // Return original string if parsing fails
    }
  };

  const filteredData = data.filter(stock => 
    stock.ticker.toLowerCase().includes(searchQuery.toLowerCase()) || 
    stock.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-screen h-screen relative font-sans text-slate-200">
      
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 w-full p-6 z-20 pointer-events-none flex flex-col md:flex-row justify-between items-start md:items-center bg-gradient-to-b from-slate-900/80 to-transparent gap-4">
        <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-yellow-400">
            B3 Market Physics
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-md hidden md:block">
            Interactive B3 (Brazil) visualization driven by Gemini Google Search Grounding.
            Drag bubbles to throw them. Real-time data physics.
            </p>
        </div>
        
        <div className="pointer-events-auto flex flex-col md:flex-row items-end md:items-center gap-3">
             {/* Search Bar */}
             <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  className="block w-48 pl-10 pr-3 py-2 border border-slate-700 rounded-full leading-5 bg-slate-800/50 text-slate-300 placeholder-slate-500 focus:outline-none focus:bg-slate-800 focus:border-green-500 focus:ring-1 focus:ring-green-500 sm:text-sm transition-all shadow-lg backdrop-blur-sm"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
             </div>

            <button 
                onClick={loadData}
                disabled={loading}
                className={`
                    flex items-center space-x-2 px-4 py-2 rounded-full border border-slate-700 transition-all shadow-lg
                    ${loading ? 'bg-slate-800/80 cursor-wait opacity-80' : 'bg-slate-800/50 hover:bg-slate-700 hover:border-slate-500 cursor-pointer active:scale-95'}
                `}
            >
                {loading ? (
                    <>
                        <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="hidden md:inline text-sm font-medium text-slate-300">Updating</span>
                    </>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span className="hidden md:inline text-sm font-medium text-white">Refresh</span>
                    </>
                )}
            </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="w-full h-full relative">
        {filteredData.length > 0 ? (
            <StockBubbles data={filteredData} />
        ) : (
             !loading && data.length > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-slate-900/80 backdrop-blur-md p-6 rounded-xl border border-slate-700 text-center">
                        <div className="text-slate-400 text-lg">No matches found for</div>
                        <div className="text-white text-xl font-bold mt-1">"{searchQuery}"</div>
                        <button 
                            onClick={() => setSearchQuery("")}
                            className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-blue-400 pointer-events-auto transition-colors"
                        >
                            Clear Search
                        </button>
                    </div>
                </div>
             )
        )}
      </main>

      {/* Footer Sources */}
      <div className="absolute bottom-0 left-0 w-full p-4 z-20 pointer-events-none">
         <div className="max-w-4xl mx-auto flex flex-col items-center">
            {sources.length > 0 && (
                <div className="pointer-events-auto bg-slate-900/60 backdrop-blur-md rounded-lg p-3 border border-slate-700/50 text-xs text-slate-400 max-h-24 overflow-y-auto w-full">
                    <span className="font-semibold text-slate-300 mr-2">Sources:</span>
                    {sources.map((src, idx) => (
                        <a 
                          key={idx} 
                          href={src} 
                          target="_blank" 
                          rel="noreferrer"
                          className="hover:text-green-400 hover:underline mr-3 break-all inline-block"
                        >
                            {getSafeHostname(src)}
                        </a>
                    ))}
                </div>
            )}
            <div className="mt-2 text-[10px] text-slate-500">
                Powered by Google Gemini • Physics Engine v1.0 • No Friction
            </div>
         </div>
      </div>

    </div>
  );
}

export default App;