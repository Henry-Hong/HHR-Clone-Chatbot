import Flex from '@/components/cores/Flex';
import './index.css';
import Footer from '@/components/customs/Footer';

function App() {
  return (
    <Flex variants="verticalCenter" className="bg-gray-100 w-screen h-dvh relative overflow-y-scroll">
      <Footer></Footer>
    </Flex>
  );
}

export default App;
