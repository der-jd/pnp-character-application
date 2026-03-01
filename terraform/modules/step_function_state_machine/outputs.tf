output "state_machine_arn" {
  description = "ARN of the step function state machine"
  value       = aws_sfn_state_machine.state_machine.arn
}

output "state_machine_name" {
  description = "Name of the step function state machine"
  value       = aws_sfn_state_machine.state_machine.name
}
