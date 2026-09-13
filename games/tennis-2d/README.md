# Tennis 2D

Phaser와 TypeScript로 개발하는 탑다운 방식의 2D 웹 테니스 게임입니다.

현재 버전은 플레이어 이동, 라켓 스윙, 공의 높이와 바운드, AI 상대, 득점 처리가 구현된 초기 MVP입니다.

## 실행 방법

`web-games` 저장소 루트에서 실행합니다.

```bash
pnpm install
pnpm dev:tennis
```

테니스 게임 폴더에서 직접 실행할 수도 있습니다.

```bash
cd games/tennis-2d
pnpm dev
```

## 조작법

- 이동: `WASD` 또는 방향키
- 스윙: `Space` 또는 마우스 클릭
- 샷 방향: 마우스 위치
- 승리 조건: 5점을 먼저 획득

공이 플레이어 가까이에 있고 타격 가능한 높이에 있을 때 스윙해야 공을 칠 수 있습니다.

## 코드 구조

```text
src/
├── config/
│   └── gameConfig.ts    # Phaser 화면, 물리, Scene 설정
├── objects/
│   ├── Ball.ts          # 공의 이동, 높이, 바운드, 타격
│   └── Player.ts        # 플레이어 이동과 라켓 스윙
├── scenes/
│   └── GameScene.ts     # 경기 진행, AI, 판정, 화면 구성
├── systems/
│   └── ScoreSystem.ts   # 점수 및 승리 판정
├── types/
│   └── game.ts          # 게임 공통 타입
├── main.ts              # 게임 시작 지점
└── style.css            # 페이지 기본 스타일
```

## 개발 예정 기능

- 서브 및 리시브 시스템
- 포핸드, 백핸드, 로브, 슬라이스
- 실제 테니스 점수 규칙과 듀스
- AI 난이도 선택
- 캐릭터 및 코트 그래픽
- 효과음과 애니메이션
- 모바일 터치 조작
- 온라인 멀티플레이

## 빌드

저장소 루트에서 전체 게임을 빌드합니다.

```bash
pnpm build
```

테니스 게임만 빌드하려면 다음 명령을 사용합니다.

```bash
pnpm --filter @web-games/tennis-2d build
```
