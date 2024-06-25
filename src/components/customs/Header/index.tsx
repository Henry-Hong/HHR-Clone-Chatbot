import Flex from '@/components/cores/Flex';
import Robot from '/img_robot.gif';
import Dialog from '@/components/cores/Dialog';
import Svg from '@/components/cores/Svg';
import LabeldText from './LabldText';

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
              <Svg
                iconName="ic_github"
                svgProps={{
                  className: 'w-10 h-10 cursor-pointer hover:opacity-80',
                  onClick: () => window.open('https://github.com/Henry-Hong', '_blank'),
                }}
              />
              <Svg
                iconName="ic_notion"
                svgProps={{
                  className: 'w-10 h-10 cursor-pointer hover:opacity-80',
                  onClick: () =>
                    window.open(
                      'https://kfo5a5rloe.execute-api.ap-northeast-2.amazonaws.com/THIS_IS_MY_STAGE/redirect?type=blog&from=chatbot',
                      '_blank'
                    ),
                }}
              />
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
