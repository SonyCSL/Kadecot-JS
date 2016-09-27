#!/bin/bash

NODE_VERSION="4.x"
CROSSBAR_VERSION="0.15.0"
SUDO_PATH=$(command -v sudo)

function sudo () {
  if [ -n $SUDO_PATH ];then
    eval $SUDO_PATH $@
  else
    eval $@
  fi
}

function installRequiredPackages () {
  echo "Installing required packages (Please wait)"
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

function installPip () {
  if [ ! -n "$(command -v python)" ]; then
    echo "Error: python is required." >&2
    echo "  Please install python." >&2
    return 255
  fi

  if [ -n "$(command -v pip)" ]; then
    if [ "$(pip --version | awk '{ print $2 }' | awk -F. '{print $1}')" -ge 8 ]; then
      echo "pip is already installed. Version: $(pip --version | awk '{ print $2 }')"
      return 0
    else
      echo "Installing pip (Please wait)"
      sudo pip install -U pip >/dev/null
      sudo pip install -U six >/dev/null
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

function installCrossbar () {
  if [ ! -n "$(command -v pip)" ]; then
    echo "Error: pip is required." >&2
    echo "  Please install pip." >&2
    return 255
  fi

  if [ -n "$(command -v crossbar)" ]; then
    INSTALLED_CROSSBAR_VERSION=$(crossbar version | grep --color=never 'Crossbar.io' | awk -F':' '{ print $2 }' | sed 's/\s//g')
    echo "Crossbar.io is already installed. Version: ${INSTALLED_CROSSBAR_VERSION}"
    return 0
  fi

  echo "Installing Crossbar.io (Please wait)"

  ( sudo pip install "crossbar==${CROSSBAR_VERSION}" >/dev/null ) || \
  ( ( echo -e "\n*** Exec \"Install Required Packages\" first. ***\n" >&2 ) && return 255 )

  echo -e "Done.\n"
}

function installNode () {
  ## https://github.com/nodesource/distributions
  if [ -n "$(command -v node)" ]; then
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

function installKadecotJs () {
  echo "Installing Kadecot|JS"

  if [ -d $HOME/.kadecot ]; then
    echo "Kadecot|JS is already installed."
    return 0
  fi

  git clone --depth 1 https://github.com/SonyCSL/Kadecot-JS $HOME/.kadecot > /dev/null 2>/dev/null
  sudo ln -s $HOME/.kadecot/kadecot /usr/local/bin/kadecot > /dev/null
  sudo chmod a+x $HOME/.kadecot/kadecot /usr/local/bin/kadecot > /dev/null

  cd $HOME/.kadecot && npm install --silent > /dev/null
  ls -d $HOME/.kadecot/v1/plugins/* | xargs -I{} bash -c 'cd {} && npm install --silent' > /dev/null

  echo "Installed Kadecot|JS to $HOME/.kadecot";

  echo -e "Done.\n"
}

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
