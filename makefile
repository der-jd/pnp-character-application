install-lint-terraform:
	curl --silent https://raw.githubusercontent.com/terraform-linters/tflint/master/install_linux.sh | bash
	tflint --init
