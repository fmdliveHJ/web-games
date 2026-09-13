# Web Games

TypeScript를 공통 언어로 사용해 여러 2D·3D 웹게임을 개발하고 관리하는 모노레포입니다.

현재 첫 번째 게임으로 Phaser 기반의 `Tennis 2D`를 개발하고 있습니다. 이후 새로운 게임은 `games` 아래에 각각 독립적인 앱으로 추가합니다.

## 기술 스택

- 언어: TypeScript
- 2D 엔진: Phaser
- 3D 엔진: Three.js 또는 Babylon.js
- 개발 서버 및 빌드: Vite
- 패키지 관리: pnpm workspace

## 프로젝트 구조

```text
web-games/
├── games/
│   └── tennis-2d/       # Phaser 기반 2D 테니스 게임
├── shared/
│   ├── assets/          # 여러 게임에서 사용하는 공용 이미지
│   ├── audio/           # 공용 음악과 효과음
│   ├── ui/              # 공용 UI 구성 요소
│   └── utils/           # 공용 유틸리티
├── experiments/         # 물리, 카메라, 렌더링 기술 실험
├── package.json         # 저장소 공통 명령
└── pnpm-workspace.yaml  # 워크스페이스 구성
```

공용 코드는 처음부터 만들지 않고, 두 개 이상의 게임에서 실제로 반복되는 코드만 `shared`로 옮깁니다.

## 시작하기

### 요구 환경

- Node.js 20 이상
- pnpm 10 이상

pnpm이 없다면 다음 명령으로 설치합니다.

```bash
npm install --global pnpm
```

### 의존성 설치

저장소 루트에서 실행합니다.

```bash
pnpm install
```

### Tennis 2D 실행

```bash
pnpm dev:tennis
```

터미널에 표시되는 로컬 주소를 브라우저에서 열면 게임을 실행할 수 있습니다.

### 전체 게임 빌드

```bash
pnpm build
```

## 새로운 게임 추가

새 게임은 `games` 아래에 별도 폴더로 추가합니다.

```text
games/
├── tennis-2d/
├── racing-3d/
└── puzzle-2d/
```

게임별 패키지 이름은 다음 형식을 사용합니다.

```json
{
  "name": "@web-games/racing-3d",
  "private": true
}
```

루트 `package.json`에 실행 명령을 추가하면 루트에서 각 게임을 실행할 수 있습니다.

```json
{
  "scripts": {
    "dev:tennis": "pnpm --filter @web-games/tennis-2d dev",
    "dev:racing": "pnpm --filter @web-games/racing-3d dev"
  }
}
```

## 브랜치 운영

현재는 개인 개발 프로젝트이므로 `main` 브랜치를 기본으로 사용합니다. 변경 범위가 크거나 실패 가능성이 있는 실험만 `experiment/*` 브랜치에서 진행합니다.
