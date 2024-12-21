format-terraform:
	terraform fmt terraform

check-format-terraform:
	terraform fmt -check terraform && echo "SUCCESS: Format is correct!" ||  (echo "ERROR: Formatting errors found! Run 'make format-terraform' to fix them."; exit 1)

install-lint-terraform:
	curl --silent https://raw.githubusercontent.com/terraform-linters/tflint/master/install_linux.sh | bash
	tflint --init

lint-terraform:
	tflint --chdir=terraform && echo "SUCCESS: No lint errors found!"
