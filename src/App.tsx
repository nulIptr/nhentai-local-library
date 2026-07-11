import { Route, Switch } from 'wouter'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Library } from './pages/Library'
import { Reader } from './pages/Reader'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      refetchOnWindowFocus: false
    }
  }
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Switch>
        <Route path="/" component={Library} />
        <Route path="/reader/:id" component={Reader} />
      </Switch>
    </QueryClientProvider>
  )
}

export default App
