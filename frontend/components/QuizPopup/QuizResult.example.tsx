/**
 * QuizResult Component - Usage Examples
 *
 * EPIC-07 Task #19: QuizResult 컴포넌트 사용 예시
 */

import React from 'react';
import QuizResult from './QuizResult';

/**
 * Example 1: Correct Answer
 *
 * 정답을 맞춘 경우의 QuizResult 표시
 */
export const CorrectAnswerExample = () => {
  return (
    <QuizResult
      isCorrect={true}
      correctAnswer="Amazon Aurora"
      explanation="Amazon Aurora는 MySQL 및 PostgreSQL과 호환되는 완전 관리형 관계형 데이터베이스로, 표준 MySQL보다 최대 5배 빠른 성능을 제공합니다. 고가용성과 내구성을 갖춘 엔터프라이즈급 데이터베이스입니다."
      playerAnswer="Amazon Aurora"
    />
  );
};

/**
 * Example 2: Incorrect Answer
 *
 * 오답을 선택한 경우의 QuizResult 표시
 */
export const IncorrectAnswerExample = () => {
  return (
    <QuizResult
      isCorrect={false}
      correctAnswer="Amazon EKS (Elastic Kubernetes Service)"
      explanation="Amazon EKS는 AWS에서 Kubernetes를 쉽게 실행할 수 있도록 하는 관리형 서비스입니다. 컨테이너화된 애플리케이션의 배포, 관리 및 확장을 자동화하며, AWS의 다른 서비스들과 긴밀하게 통합됩니다."
      playerAnswer="Amazon ECS (Elastic Container Service)"
    />
  );
};

/**
 * Example 3: Multiple Choice Quiz Result (Correct)
 *
 * 4지선다 퀴즈의 정답 결과
 */
export const MultipleChoiceCorrectExample = () => {
  return (
    <QuizResult
      isCorrect={true}
      correctAnswer="3) 99.99%"
      explanation="Aurora Global Database는 최대 99.99%의 가용성을 제공합니다. 이는 여러 AWS 리전에 걸쳐 데이터를 복제하고, 재해 복구 기능을 제공하여 글로벌 애플리케이션에 적합한 솔루션입니다."
      playerAnswer="3) 99.99%"
    />
  );
};

/**
 * Example 4: Multiple Choice Quiz Result (Incorrect)
 *
 * 4지선다 퀴즈의 오답 결과
 */
export const MultipleChoiceIncorrectExample = () => {
  return (
    <QuizResult
      isCorrect={false}
      correctAnswer="2) Amazon CloudFront"
      explanation="Amazon CloudFront는 AWS의 CDN(Content Delivery Network) 서비스입니다. 전 세계에 분산된 엣지 로케이션을 통해 콘텐츠를 캐싱하여 사용자에게 더 빠르게 전달하고, DDoS 공격으로부터 보호합니다. CloudWatch는 모니터링 서비스이며, Route 53은 DNS 서비스입니다."
      playerAnswer="3) Amazon Route 53"
    />
  );
};

/**
 * Example 5: OX Quiz Result (Correct)
 *
 * OX 퀴즈의 정답 결과
 */
export const OXQuizCorrectExample = () => {
  return (
    <QuizResult
      isCorrect={true}
      correctAnswer="O (맞음)"
      explanation="맞습니다. Amazon S3는 99.999999999%(11 9's)의 내구성을 제공합니다. 이는 객체 10,000,000개를 S3에 저장하는 경우 평균적으로 10,000년마다 하나의 객체를 손실할 수 있다는 의미입니다."
      playerAnswer="O (맞음)"
    />
  );
};

/**
 * Example 6: OX Quiz Result (Incorrect)
 *
 * OX 퀴즈의 오답 결과
 */
export const OXQuizIncorrectExample = () => {
  return (
    <QuizResult
      isCorrect={false}
      correctAnswer="X (틀림)"
      explanation="틀렸습니다. AWS Lambda는 호출 횟수와 실행 시간에 따라 과금됩니다. 코드가 실행되지 않을 때는 비용이 발생하지 않습니다. 반면 EC2는 인스턴스가 실행 중인 전체 시간에 대해 과금됩니다."
      playerAnswer="O (맞음)"
    />
  );
};

/**
 * Example 7: Long Explanation
 *
 * 긴 해설이 포함된 QuizResult (500자 가까이)
 */
export const LongExplanationExample = () => {
  return (
    <QuizResult
      isCorrect={true}
      correctAnswer="Amazon VPC (Virtual Private Cloud)"
      explanation="Amazon VPC는 AWS 클라우드에서 논리적으로 격리된 가상 네트워크를 프로비저닝할 수 있는 서비스입니다. VPC를 사용하면 자체 IP 주소 범위 선택, 서브넷 생성, 라우팅 테이블 및 네트워크 게이트웨이 구성 등 가상 네트워킹 환경을 완벽하게 제어할 수 있습니다. 퍼블릭 서브넷과 프라이빗 서브넷을 모두 사용하여 다중 계층 아키텍처를 구현할 수 있으며, 보안 그룹과 네트워크 ACL을 통해 인바운드 및 아웃바운드 트래픽을 세밀하게 제어할 수 있습니다. VPC는 기업의 데이터 센터를 AWS 클라우드로 확장하는 데 필수적인 서비스입니다."
      playerAnswer="Amazon VPC (Virtual Private Cloud)"
    />
  );
};

/**
 * Example 8: Component Integration in Quiz Flow
 *
 * 퀴즈 플로우에서의 QuizResult 통합 예시
 */
export const QuizFlowIntegrationExample = () => {
  const [quizState, setQuizState] = React.useState<'answering' | 'result'>('answering');
  const [isCorrect, setIsCorrect] = React.useState(false);
  const [playerAnswer, setPlayerAnswer] = React.useState('');

  const handleSubmit = (answer: string) => {
    setPlayerAnswer(answer);
    setIsCorrect(answer === 'Amazon Aurora');
    setQuizState('result');
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {quizState === 'answering' ? (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">다음 중 관계형 데이터베이스 서비스는?</h2>
          <button
            onClick={() => handleSubmit('Amazon Aurora')}
            className="w-full p-4 bg-blue-500 text-white rounded"
          >
            Amazon Aurora
          </button>
          <button
            onClick={() => handleSubmit('Amazon S3')}
            className="w-full p-4 bg-blue-500 text-white rounded"
          >
            Amazon S3
          </button>
        </div>
      ) : (
        <QuizResult
          isCorrect={isCorrect}
          correctAnswer="Amazon Aurora"
          explanation="Amazon Aurora는 MySQL 및 PostgreSQL과 호환되는 완전 관리형 관계형 데이터베이스로, 표준 MySQL보다 최대 5배 빠른 성능을 제공합니다."
          playerAnswer={playerAnswer}
        />
      )}
    </div>
  );
};

/**
 * Example 9: With Animation Container
 *
 * 애니메이션 컨테이너와 함께 사용하는 예시
 */
export const WithAnimationContainerExample = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <QuizResult
          isCorrect={false}
          correctAnswer="Amazon ElastiCache"
          explanation="Amazon ElastiCache는 클라우드에서 인메모리 데이터 스토어 및 캐시를 쉽게 설정, 관리 및 확장할 수 있는 웹 서비스입니다. Redis 또는 Memcached와 호환되는 엔진을 선택할 수 있으며, 밀리초 미만의 응답 시간을 제공합니다."
          playerAnswer="Amazon DynamoDB"
        />
      </div>
    </div>
  );
};

/**
 * Example 10: Dark Mode Support
 *
 * 다크 모드 지원 예시
 */
export const DarkModeExample = () => {
  return (
    <div className="dark min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <QuizResult
          isCorrect={true}
          correctAnswer="AWS IAM (Identity and Access Management)"
          explanation="AWS IAM은 AWS 리소스에 대한 액세스를 안전하게 제어할 수 있는 서비스입니다. IAM을 사용하여 AWS 사용자 및 그룹을 만들고 관리하며, 권한을 사용하여 AWS 리소스에 대한 액세스를 허용 및 거부할 수 있습니다."
          playerAnswer="AWS IAM (Identity and Access Management)"
        />
      </div>
    </div>
  );
};

export default {
  CorrectAnswerExample,
  IncorrectAnswerExample,
  MultipleChoiceCorrectExample,
  MultipleChoiceIncorrectExample,
  OXQuizCorrectExample,
  OXQuizIncorrectExample,
  LongExplanationExample,
  QuizFlowIntegrationExample,
  WithAnimationContainerExample,
  DarkModeExample,
};
