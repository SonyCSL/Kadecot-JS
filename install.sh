#!/bin/bash

NODE_VERSION="4.x"
CROSSBAR_VERSION="0.15.0"
SUDO_PATH=$(command -v sudo)

# sudo がない環境でも sudo をつけられるようにする
function sudo () {
  if [ -n $SUDO_PATH ];then
    $SUDO_PATH "$@"
  else
    "$@"
  fi
}

# インストールに必要なパッケージをインストール
function installRequiredPackages () {
  echo "Installing required packages (Please wait)"

  # yum か apt-get かで分岐
  if [ -n "$(command -v yum)" ]; then
    sudo yum groupinstall -y 'Development Tools' >/dev/null 2>/dev/null
    sudo yum install -y \
      git curl python python-devel \
      openssl-devel libffi-devel >/dev/null
  elif [ -n "$(command -v apt-get)" ]; then
    sudo apt-get update >/dev/null
    sudo apt-get install -y \
      git curl python build-essential \
      libssl-dev libffi-dev python-dev >/dev/null
  fi
  echo -e "Done.\n"
}

# Python のパッケージマネージャ pip をインストール
function installPip () {
  # Python が入っているかチェック
  if [ ! -n "$(command -v python)" ]; then
    echo "Error: python is required." >&2
    echo "  Please install python." >&2
    return 255
  fi

  # pip が入っているかチェック
  if [ -n "$(command -v pip)" ]; then
    # pip のバージョンが 8 以上になっているかチェック
    if [ "$(pip --version | awk '{ print $2 }' | awk -F. '{print $1}')" -ge 8 ]; then
      echo "pip is already installed. Version: $(pip --version | awk '{ print $2 }')"
      return 0
    else
      # pip のアップデート
      echo "Installing pip (Please wait)"
      sudo -H pip install -U pip >/dev/null
      sudo -H pip install -U setuptools >/dev/null
      sudo -H pip install -U six >/dev/null
      echo -e "Done.\n"
      return 0
    fi
  fi

  echo "Installing pip (Please wait)"
  curl -skL https://bootstrap.pypa.io/get-pip.py -o /tmp/get-pip.py >/dev/null
  sudo python /tmp/get-pip.py >/dev/null
  rm /tmp/get-pip.py >/dev/null
  echo -e "Done.\n"
}

# Crossbar のインストール
function installCrossbar () {
  # pip が入っているかチェック
  if [ ! -n "$(command -v pip)" ]; then
    echo "Error: pip is required." >&2
    echo "  Please install pip." >&2
    return 255
  fi

  # Crossbar が入っているかチェック
  if [ -n "$(command -v crossbar)" ]; then
    INSTALLED_CROSSBAR_VERSION=$(crossbar version | grep --color=never 'Crossbar.io' | awk -F':' '{ print $2 }' | sed 's/\s//g')
    echo "Crossbar.io is already installed. Version: ${INSTALLED_CROSSBAR_VERSION}"
    return 0
  fi

  echo "Installing Crossbar.io (Please wait)"

  # Crossbar のインストール（1行目）に失敗したら，エラーを返す（2行目）
　# -Hオプションは、ルート権限でユーザーディレクトリに.cacheを掘ろうとして怒られることがあるため。
  ( sudo -H pip install "crossbar>=${CROSSBAR_VERSION}" >/dev/null ) || \
  ( ( echo -e "\n*** Exec \"Install Required Packages\" first. ***\n" >&2 ) && return 255 )

  echo -e "Done.\n"
}

# Node.js のインストール
function installNode () {
  ## https://github.com/nodesource/distributions

  # node が入っているかチェック
  if [ -n "$(command -v node)" ]; then
    # バージョンが 4 以上かチェック
    if [ "$(node --version | sed -e 's/[^0-9.]//g' | awk -F. '{print $1}')" -ge 4 ]; then
      echo "Node.js is already installed. Version: $(node --version)"
      return 0
    fi
  fi

  echo "Installing Node.js v4.x (Please wait)"
  if [ -n "$(command -v yum)" ]; then
    curl -skL "https://rpm.nodesource.com/setup_${NODE_VERSION}" | sudo bash - >/dev/null
    sudo yum install -y nodejs >/dev/null
  elif [ -n "$(command -v apt-get)" ]; then
    curl -skL "https://deb.nodesource.com/setup_${NODE_VERSION}" | sudo bash - >/dev/null
    sudo apt-get install -y nodejs >/dev/null
  fi
  echo -e "Done.\n"
}

# Kadecot-JS のインストール
function installKadecotJs () {
  echo "Installing Kadecot|JS"

  # $HOME/.kadecot フォルダがあれば終了
  if [ -d $HOME/.kadecot ]; then
    echo "Kadecot|JS is already installed."
    return 0
  fi

  # $HOME/.kadecot に Kadecot-JS を clone する
  git clone --depth 1 https://github.com/SonyCSL/Kadecot-JS $HOME/.kadecot > /dev/null 2>/dev/null
  # kadecot コマンドをパスに通す
  sudo ln -s $HOME/.kadecot/kadecot /usr/local/bin/kadecot > /dev/null
  sudo chmod a+x $HOME/.kadecot/kadecot /usr/local/bin/kadecot > /dev/null

  # npm install をする
  cd $HOME/.kadecot && npm install --silent > /dev/null
  # plugins のフォルダすべてに npm install する
  ls -d $HOME/.kadecot/v1/plugins/* | xargs -I{} bash -c 'cd {} && npm install --silent' > /dev/null

  echo "Installed Kadecot|JS to $HOME/.kadecot";

  echo -e "Done.\n"
}

# バージョンを抽出して表示
function showVersions () {
  INSTALLED_PYTHON_VERSION=$(\
    [ -n "$(command -v python)" ] && \
    ( (python --version 2>&1) | awk '{ print $2 }' ) || \
    echo 'Not found'
  )

  INSTALLED_PIP_VERSION=$(\
    [ -n "$(command -v pip)" ] && \
    ( pip --version | awk '{ print $2 }' ) || \
    echo 'Not found'
  )

  INSTALLED_CROSSBAR_VERSION=$(\
    [ -n "$(command -v crossbar)" ] && \
    ( crossbar version | grep --color=never 'Crossbar.io' | \
      awk -F':' '{ print $2 }' | sed 's/\s//g' ) || \
    echo 'Not found'
  )

  INSTALLED_NODE_VERSION=$(\
    [ -n "$(command -v node)" ] && \
    ( node --version | sed 's/[^0-9\.]//g' ) || \
    echo 'Not found'
  )

  echo "Versions"
  printf "%-10s %s\n" "Python" "$INSTALLED_PYTHON_VERSION"
  printf "%-10s %s\n" "pip" "$INSTALLED_PIP_VERSION"
  printf "%-10s %s\n" "Crossbar" "$INSTALLED_CROSSBAR_VERSION"
  printf "%-10s %s\n" "Node.js" "$INSTALLED_NODE_VERSION"
  echo ""
}

function automaticInstall () {
  installRequiredPackages && \
  installPip && \
  installCrossbar && \
  installNode && \
  installKadecotJs && \
  echo -e "\n*** The installation was successful. ***"
  echo -e "\nRun Kadecot|JS by hitting 'kadecot startfg', and"
  echo -e "\naccess http://KADECOT_IP_ADDRESS:31413/ from your web browser."
  exit 0
}

function main () {
  welcome
  showVersions
  sleep 1

  echo "You will be started automatic install in 10 seconds."
  echo "If you want to install manually, please press any key."
  echo ""

  for t in $(seq 1 10); do
    echo -n "."
    # 1秒間入力を待って，入力があれば selectDo に行く
    read -t 1 && ( echo ""; selectDo; ) && exit 0
  done
  echo ""
  automaticInstall
}

function welcome () {
  ## Welcome Message
  cat <<'EOF'
   _  __              _                         _
  | |/ /   __ _    __| |   ___    ___    ___   | |_
  | ' /   / _` |  / _` |  / _ \  / __|  / _ \  | __|
  | . \  | (_| | | (_| | |  __/ | (__  | (_) | | |_
  |_|\_\  \__,_|  \__,_|  \___|  \___|  \___/   \__|
  ==================================================

EOF

  echo -e "Welcome to Kadecot|JS Installer!\n"
}

function selectDo () {
  PS3='Please enter your choice > '

  options=( \
  "Automatic Install (** RECOMMENDED **)" \
  "Install Required Packages" \
  "Install pip" \
  "Install Crossbar.io" \
  "Install Node.js v4.x" \
  "Install Kadecot|JS" \
  "Show versions" \
  "Quit" )

  select opt in "${options[@]}"
  do
    echo -ne "\n"
    case $opt in
      "Automatic Install (** RECOMMENDED **)")
        automaticInstall
        ;;
      "Install Required Packages")
        installRequiredPackages
        ;;
      "Install pip")
        installPip
        ;;
      "Install Crossbar.io")
        installCrossbar
        ;;
      "Install Node.js v4.x")
        installNode
        ;;
      "Install Kadecot|JS")
        installKadecotJs
        ;;
      "Show versions")
        showVersions
        ;;
      "Quit")
        echo "Bye!"
        break
        ;;
      *)
        echo "Not found."
        ;;
    esac
    echo -ne "\n"
  done
}

main
