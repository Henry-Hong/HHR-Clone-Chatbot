import Flex from '@/components/cores/Flex';

export default function LabeldText({ label, text }: { label: string; text: string }) {
  return (
    <Flex variants="verticalLeft">
      <p className="text-sm text-gray-400">{label}</p>
      <p>{text}</p>
    </Flex>
  );
}
