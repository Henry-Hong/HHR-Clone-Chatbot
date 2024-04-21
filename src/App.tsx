import { useChatMutation } from "./apis";
import Flex from "@/components/cores/Flex";
import "./index.css";

function App() {
  const { mutate, data, isPending } = useChatMutation();
  return (
    <Flex className="flex flex-col bg-gray-100 w-screen h-dvh">
      <div>{isPending ? "pending" : "done"}</div>
      <button onClick={() => mutate("안녕")}>click me</button>
      <div>{JSON.stringify(data)}</div>
    </Flex>
  );
}

export default App;
