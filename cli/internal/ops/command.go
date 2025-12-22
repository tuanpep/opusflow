package ops

import (
	"fmt"
	"os/exec"

	"github.com/ergonml/opusflow/internal/manager"
)

func RunCommand(command string) (string, error) {
	root, err := manager.FindProjectRoot()
	if err != nil {
		return "", fmt.Errorf("failed to find project root: %w", err)
	}

	// Security/Safety: Basic check to prevent accidental destructive commands if needed?
	// For now, we trust the agent as this is a developer tool.

	// Use sh -c to execute
	cmd := exec.Command("sh", "-c", command)
	cmd.Dir = root

	output, err := cmd.CombinedOutput()

	result := string(output)
	if err != nil {
		return fmt.Sprintf("Command failed: %v\nOutput:\n%s", err, result), nil
	}

	if len(result) > 50000 {
		result = result[:50000] + "\n... truncated ..."
	}

	return result, nil
}
