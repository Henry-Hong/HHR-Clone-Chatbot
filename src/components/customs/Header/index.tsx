import Flex from '@/components/cores/Flex';
const Robot = '/img_robot.gif';

/*
 * 브랜드 로고는 lucide에 없다 (lucide는 브랜드 아이콘을 제공하지 않는다).
 * 그래서 이 셋만 기존 SVG를 그대로 쓰되, 정적 import로 번들에 함께 들어간다.
 * UI 아이콘은 전부 lucide-react를 쓴다.
 */
import GithubLogo from '@/assets/svgs/ic_github.svg?react';
import LinkedinLogo from '@/assets/svgs/ic_linkedin.svg?react';
import NotionLogo from '@/assets/svgs/ic_notion.svg?react';
import Dialog from '@/components/cores/Dialog';
import LabeldText from './LabldText';

const LINKS = [
  { label: 'GitHub', href: 'https://github.com/Henry-Hong', Logo: GithubLogo },
  {
    label: 'Notion',
    href: 'https://kfo5a5rloe.execute-api.ap-northeast-2.amazonaws.com/THIS_IS_MY_STAGE/redirect?type=blog&from=chatbot',
    Logo: NotionLogo,
  },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/heerim/', Logo: LinkedinLogo },
];

export default function Header() {
  return (
    <Flex className="w-full justify-center p-2 h-[64px] fixed top-0 shadow-md z-10 bg-white">
      <Dialog>
        <Dialog.Trigger render={<img src={Robot} className="w-[90px] -mb-2 cursor-pointer" />} />
        <Dialog.Content>
          <Flex variants="verticalLeft" className="p-5 gap-2 w-[280px]">
            <LabeldText label="Project" text="홍희림 클론 챗봇" />
            <LabeldText label="Author" text="Henry Hong" />
            <LabeldText label="Email" text="devheerim@gmail.com" />
            <Flex variants="horizontalCenter" className="w-full gap-2 my-2">
              {LINKS.map(({ label, href, Logo }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="rounded hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
                >
                  <Logo className="w-10 h-10" aria-hidden />
                </a>
              ))}
            </Flex>
            <Flex className="w-full">
              <Dialog.Cancel
                className="mx-auto px-2 py-1 bg-blue-400 rounded text-white hover:bg-blue-400/80"
                children={'Close✋'}
              />
            </Flex>
          </Flex>
        </Dialog.Content>
      </Dialog>
    </Flex>
  );
}
