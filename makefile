install-lint-terraform:
	curl --silent https://raw.githubusercontent.com/terraform-linters/tflint/master/install_linux.sh | TFLINT_VERSION="v0.57.0" bash
	tflint --init
