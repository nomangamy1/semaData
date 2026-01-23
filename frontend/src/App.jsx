import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* First Page */}
      <div className="min-h-screen flex flex-col items-center justify-between p-4 md:p-8">
        
        {/* Header */}
        <header className="w-full text-center pt-4 md:pt-8">
          <h1 className="text-xl md:text-2xl font-semibold uppercase tracking-widest text-purple-300">
            semaData Platform
          </h1>
        </header>
        
        {/* Main Content */}
        <main className="flex flex-col items-center justify-center flex-1 text-center space-y-8 md:space-y-12 px-4">
          
          {/* Logo */}
          <div className="mb-4">
            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black 
                         bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent
                         tracking-tight leading-none">
              SemaData
            </h1>
          </div>
          
          {/* Tagline */}
          <div className="max-w-2xl lg:max-w-3xl">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold 
                         bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-200 
                         bg-clip-text text-transparent
                         leading-tight">
              Kenya First AI dataCollector
            </h2>
          </div>
          
          {/* Optional Description */}
          <div className="max-w-xl mt-4">
            <p className="text-lg text-blue-200 opacity-90">
              Transforming data collection with cutting-edge artificial intelligence
            </p>
          </div>  
        </main>
      </div>
    </div>
  )
}

export default App